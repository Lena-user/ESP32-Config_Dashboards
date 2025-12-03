#include <WiFi.h>
#include <Arduino_MQTT_Client.h>
#include <ThingsBoard.h>
#include "DHT20.h"
#include "DHT.h"
#include <Wire.h>
#include <ArduinoOTA.h>
#include <web.h>
#include <global.h>

#define LED_PIN 48
#define SDA_PIN GPIO_NUM_11
#define SCL_PIN GPIO_NUM_12
#define DHTPIN 6
#define DHTTYPE DHT11
#define LIGHT_PIN 1
#define FILTER_SAMPLES 10

constexpr char TOKEN[] = "g14piik3js3eq55lkbf2";
constexpr char THINGSBOARD_SERVER[] = "app.coreiot.io";
constexpr uint16_t THINGSBOARD_PORT = 1883U;
constexpr uint32_t MAX_MESSAGE_SIZE = 1024U;
constexpr uint32_t SERIAL_DEBUG_BAUD = 115200U;

constexpr char SEND_INTERVAL_ATTR[] = "sendInterval";
constexpr char WIFI_SSID_ATTR[] = "wifi_ssid";
constexpr char WIFI_PASSWORD_ATTR[] = "wifi_pass";
constexpr char ID_DEVICE_ATTR[] = "id_device";


volatile bool attributesChanged = false;
volatile bool lightBufFilled = false;
volatile bool ssidUpdated = false;
volatile bool passUpdated = false;
volatile uint16_t sendInterval = 2000U;
volatile uint16_t lightBuf[FILTER_SAMPLES];
volatile uint8_t lightIdx = 0;


static bool tb_was_connected = false;
static bool tb_subscribed = false;


constexpr std::array<const char *, 4U> SHARED_ATTRIBUTES_LIST = {
    SEND_INTERVAL_ATTR,
    ID_DEVICE_ATTR,
    WIFI_SSID_ATTR,
    WIFI_PASSWORD_ATTR
};

// MQTT + TB
WiFiClient wifiClient;
Arduino_MQTT_Client mqttClient(wifiClient);
ThingsBoard tb(mqttClient, MAX_MESSAGE_SIZE);
DHT20 dht20;
DHT dht(DHTPIN, DHTTYPE);


uint16_t readLightRawFiltered() {
    lightBuf[lightIdx] = analogRead(LIGHT_PIN);
    lightIdx++;
    if (lightIdx >= FILTER_SAMPLES) {
        lightIdx = 0;
        lightBufFilled = true;
    }
    uint32_t sum = 0;
    uint8_t count = lightBufFilled ? FILTER_SAMPLES : lightIdx;
    for (uint8_t i = 0; i < count; i++) {
        sum += lightBuf[i];
    }
    return sum / count; 
}

String stripQuotes(const String &s) {
    if (s.length() >= 2 && s[0] == '\"' && s[s.length() - 1] == '\"') {
        return s.substring(1, s.length() - 1);
    }
    return s;
}

// -------------------- Shared Attribute --------------------
void processSharedAttributes(const Shared_Attribute_Data &data) {
    Serial.println("\n[ATTR] Shared attribute update received:");
    for (auto it = data.begin(); it != data.end(); ++it) {
        const char *k = it->key().c_str();
        if (!k) continue;
        String key = String(k);

        Serial.printf("  - %s = ", key.c_str());
        if (key == SEND_INTERVAL_ATTR) {
            uint16_t new_send = it->value().as<uint16_t>();
            if (new_send >= 500 && new_send <= 60000) {
                sendInterval = new_send;
                Serial.printf("%u (sendInterval)\n", sendInterval);
            } else {
                Serial.printf("%u (ignored, out of range)\n", new_send);
            }
        } else if (key == ID_DEVICE_ATTR) {
            const char *v = it->value().as<const char *>();
            if (v) {
                id_device = String(v);
                Serial.printf("%s (id_device)\n", id_device.c_str());
            } else {
                Serial.println("(null)");
            }
        } else if (key == WIFI_SSID_ATTR) {
            const char *v = it->value().as<const char *>();
            if (v) {
                String rawssid = String(v);
                wifi_ssid = stripQuotes(rawssid);
                ssidUpdated = true;
                Serial.printf("%s (deferred reconnect)\n", wifi_ssid.c_str());
            } else {
                Serial.println("(null)");
            }
        } else if (key == WIFI_PASSWORD_ATTR) {
            const char *v = it->value().as<const char *>();
            if (v) {
                String rawPass = String(v);
                wifi_pass = stripQuotes(rawPass);
                passUpdated = true;
                Serial.printf("***** (password updated, hidden) (deferred reconnect)\n");
            } else {
                Serial.println("(null)");
            }
        } else {
            auto val = it->value();

            if (val.is<const char*>()) {
                const char *strVal = val.as<const char*>();
                Serial.printf("%s (unknown string)\n", strVal ? strVal : "(null)");
            }
            else if (val.is<bool>()) {
                Serial.printf("%s (unknown bool)\n", val.as<bool>() ? "true" : "false");
            }
            else if (val.is<long>()) {
                Serial.printf("%ld (unknown number)\n", val.as<long>());
            }
            else if (val.is<float>()) {
                Serial.printf("%.2f (unknown float)\n", val.as<float>());
            }
            else {
                Serial.println("(unknown type)");
            }
        }
        if (ssidUpdated && passUpdated) {
            if (wifi_ssid != cur_SSID || wifi_pass != cur_PASS) {
                wifiReconnectRequested = true;
                Serial.println("[ATTR] WiFi config changed → trigger reconnect!");
            } else {
                Serial.println("[ATTR] WiFi config unchanged → skip reconnect");
            }
            ssidUpdated = false;
            passUpdated = false;
        }

    Serial.println("[ATTR] Done processing shared attributes\n");
    }
    attributesChanged = true;
}

const Shared_Attribute_Callback attributes_callback(&processSharedAttributes, SHARED_ATTRIBUTES_LIST.cbegin(), SHARED_ATTRIBUTES_LIST.cend());
const Attribute_Request_Callback attribute_shared_request_callback(&processSharedAttributes, SHARED_ATTRIBUTES_LIST.cbegin(), SHARED_ATTRIBUTES_LIST.cend());

// -------------------- FreeRTOS Tasks --------------------
TaskHandle_t wifiTaskHandle, tbTaskHandle, taskTbLoopHandle, taskSendAttrHandle, DHT11TaskHandle, ASTaskHandle;

void connectwf(void *parameter) {
    while (1) {
        if (wifiReconnectRequested) {
            wifiReconnectRequested = false;
            Serial.printf("[ATTR] New WiFi config received: SSID=%s\n", wifi_ssid.c_str());
            WiFi.disconnect(true);
            WiFi.mode(WIFI_STA);
            WiFi.begin(wifi_ssid.c_str(), wifi_pass.c_str());
            WiFi.persistent(true);
            uint32_t start = millis();
            while (millis() - start < 20000) {
                if (WiFi.status() == WL_CONNECTED) {
                    cur_SSID = wifi_ssid;
                    cur_PASS = wifi_pass;
                    break;
                }
                vTaskDelay(pdMS_TO_TICKS(500));
            }
        }
        vTaskDelay(pdMS_TO_TICKS(300));
    }
}

void connectTB(void *parameter) {
    static bool tb_last_connected = false;
    static bool tb_last_subscribed = false;
    while (1) {
        if (WiFi.status() == WL_CONNECTED) {
            if (!tb.connected()) {
                if (!tb_last_connected) Serial.println("[TB] Attempting connect to ThingsBoard...");
                if (!tb.connect(THINGSBOARD_SERVER, TOKEN, THINGSBOARD_PORT)) {
                    if (!tb_last_connected) Serial.println("[TB] Connect failed, will retry...");
                    tb_last_connected = false;
                    vTaskDelay(pdMS_TO_TICKS(3000));
                    continue;
                }
                Serial.println("[TB] Connected");
                tb_last_connected = true;
                tb_subscribed = false;
                tb.sendAttributeData("macAddress", WiFi.macAddress().c_str());
            }

            if (tb.connected() && !tb_subscribed) {               
                tb.Shared_Attributes_Unsubscribe(); 
                if (!tb.Shared_Attributes_Subscribe(attributes_callback)) {
                    Serial.println("[TB] Shared attr subscribe failed");
                }
                if (!tb.Shared_Attributes_Request(attribute_shared_request_callback)) {
                    Serial.println("[TB] Shared attr request failed");
                }
                tb_subscribed = true;
                Serial.println("[TB] Subscription done");
            }
        } else {
            tb_last_connected = false;
            tb_subscribed = false;
        }
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}

void taskTbLoop(void *param) {
    while (1) {
        if (WiFi.status() == WL_CONNECTED && tb.connected()) {
            tb.loop();
        }
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

void taskSendAttributeData(void *param) {
    uint32_t last = 0;
    while (1) {
        uint32_t now = millis();
        if (now - last >= 2000) {
            last = now;
            if (WiFi.status() == WL_CONNECTED && tb.connected()) {
                tb.sendAttributeData("rssi", WiFi.RSSI());
                tb.sendAttributeData("localIp", WiFi.localIP().toString().c_str());
                tb.sendAttributeData("ssid", ("\"" + cur_SSID + "\"").c_str());
                tb.sendAttributeData("pass", ("\"" + cur_PASS + "\"").c_str());
                tb.sendAttributeData("sendInterval", sendInterval);         
            }
        }
        vTaskDelay(pdMS_TO_TICKS(200));
    }
}

// --------------------------- Task: Đọc cảm biến DHT11 -----------------------
void taskDHT11Sensor(void *parameter) {
    uint32_t lastSend = 0;
    while (1) {
        uint32_t now = millis();
        if ((now - lastSend) >= sendInterval) {
            lastSend = now;

            float temperature = dht.readTemperature();
            float humidity = dht.readHumidity();

            if (isnan(temperature) || isnan(humidity)) {
                Serial.println("[DHT] Lỗi đọc cảm biến!");
            } else {
                Serial.printf("[DHT] Temp: %.2f°C, Hum: %.2f%%\n", temperature, humidity);
                glob_temperature = temperature;
                glob_humidity = humidity;
                if (WiFi.status() == WL_CONNECTED && tb.connected()) {
                    tb.sendTelemetryData("temperature", temperature);
                    tb.sendTelemetryData("humidity", humidity);
                }
            }
        }
        vTaskDelay(pdMS_TO_TICKS(20));
    }
}

// --------------------------- Task: Đọc cảm biến ánh sáng -----------------------
void taskLightSensor(void *parameter) {
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);
    uint32_t lastSend = 0;
    while (1) {
        uint32_t now = millis();
        if ((now - lastSend) >= sendInterval) {
            lastSend = now;
            uint16_t raw = readLightRawFiltered();
            float percent = (raw / 4095.0f) * 100.0f;
            Serial.printf("[LIGHT v1.2] raw=%u -> %.1f%%\n", raw, percent);
            glob_lightPercent = percent;
            if (tb.connected()) {
                tb.sendTelemetryData("light", percent);
            }
        }
        vTaskDelay(pdMS_TO_TICKS(20));
    }
}

// -------------------- Setup --------------------
void setup() {
    Serial.begin(SERIAL_DEBUG_BAUD);
    pinMode(LED_PIN, OUTPUT);
    Wire.begin(SDA_PIN, SCL_PIN);
    dht20.begin();
    dht.begin();

    // Create tasks pinned to appropriate cores (adjust stack sizes / priorities if needed)
    xTaskCreatePinnedToCore(connectwf, "WiFi Task", 4096, NULL, 1, &wifiTaskHandle, 1);
    xTaskCreatePinnedToCore(connectTB, "TB Task", 4096, NULL, 1, &tbTaskHandle, 1);
    xTaskCreatePinnedToCore(taskTbLoop, "TB Loop", 4096, NULL, 1, &taskTbLoopHandle, 1);
    xTaskCreatePinnedToCore(taskSendAttributeData, "Attr Task", 4096, NULL, 1, &taskSendAttrHandle, 1);
    xTaskCreatePinnedToCore(taskDHT11Sensor, "DHT11 Sensor", 4096, NULL, 1, &DHT11TaskHandle, 1);
    xTaskCreatePinnedToCore(taskLightSensor, "Light Sensor", 4096, NULL, 1, &ASTaskHandle, 1);
    xTaskCreate(main_server_task, "Task Main Server", 8192, NULL, 2, NULL);
}

void loop() {
}
