#include "web.h"
#include <WiFi.h>
#include <WebServer.h>

bool led1_state = false;
bool led2_state = false;
bool isAPMode = true;

WebServer server(80);

String ssid = "ESP32-YOUR NETWORK HERE!!!";
String password = "12345678";
String wifi_SSID = "";
String wifi_PASS = "";


unsigned long connect_start_ms = 0;
bool connecting = false;

String mainPage() {
  float temperature = glob_temperature;
  float humidity = glob_humidity;
  float light = glob_lightPercent;
  String led1 = led1_state ? "ON" : "OFF";
  String led2 = led2_state ? "ON" : "OFF";

  return R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ESP32 Dashboard</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; background: #f0f0f0; margin:0; display:flex; justify-content:center; align-items:center; height:100vh;}
  .container { width: 90%; max-width: 400px; background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 6px 15px rgba(0,0,0,0.15); text-align:center; }
  h2 { margin-bottom: 20px; color: #333; }
  .sensor { display: flex; justify-content: space-between; padding: 10px 0; font-size: 1.2em; border-bottom: 1px solid #eee; }
  .sensor:last-child { border-bottom: none; }
  .led-buttons { display: flex; justify-content: space-between; margin: 15px 0; }
  button { flex: 1; padding: 12px 0; margin: 0 5px; font-size: 1em; border:none; border-radius: 8px; cursor:pointer; }
  #led1Btn { background:#28a745; color:#fff; }
  #led2Btn { background:#17a2b8; color:#fff; }
  #settings { width: 100%; padding: 12px 0; margin-top: 10px; background: #ffc107; border:none; border-radius:8px; font-size:1em; color:#333; cursor:pointer; }
  button:active { opacity:0.8; }
</style>
</head>
<body>
<div class="container">
  <h2>ESP32 Dashboard</h2>
  <div class="sensor"><span>Temperature:</span><span id="temp">)rawliteral" + String(temperature,2) + R"rawliteral(</span> &deg;C</div>
  <div class="sensor"><span>Humidity:</span><span id="hum">)rawliteral" + String(humidity,2) + R"rawliteral(</span> %</div>
  <div class="sensor"><span>Light:</span><span id="light">)rawliteral" + String(light,1) + R"rawliteral(</span> %</div>
  
  <div class="led-buttons">
    <button id="led1Btn" onclick="toggleLED(1)">LED1: <span id="l1">)rawliteral" + led1 + R"rawliteral(</span></button>
    <button id="led2Btn" onclick="toggleLED(2)">LED2: <span id="l2">)rawliteral" + led2 + R"rawliteral(</span></button>
  </div>
  
  <button id="settings" onclick="window.location='/settings'">&#9881; Settings</button>
</div>

<script>
function toggleLED(id){
  fetch('/toggle?led='+id).then(r=>r.json()).then(j=>{
    document.getElementById('l1').innerText=j.led1;
    document.getElementById('l2').innerText=j.led2;
  });
}

setInterval(()=>{
  fetch('/sensors').then(r=>r.json()).then(d=>{
    document.getElementById('temp').innerText=parseFloat(d.temp).toFixed(2);
    document.getElementById('hum').innerText=parseFloat(d.hum).toFixed(2);
    document.getElementById('light').innerText=parseFloat(d.light).toFixed(1);
  });
},3000);
</script>
</body>
</html>
  )rawliteral";
}

String settingsPage() {
  return R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ESP32 Settings</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; margin:0; }
  .container { max-width: 400px; margin: 20px auto; background: #fff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 20px; }
  h2 { text-align: center; color: #333; }
  input { width: 100%; padding: 10px; margin: 10px 0; border-radius: 5px; border:1px solid #ccc; }
  button { width: 48%; padding: 12px; margin: 5px 1%; border: none; border-radius: 6px; cursor: pointer; font-size:1em; }
  #connectBtn { background: #28a745; color: white; }
  #backBtn { background: #6c757d; color: white; }
  button:active { opacity: 0.8; }
  #msg { margin-top: 10px; color: #007bff; font-weight: bold; text-align:center; }
</style>
</head>
<body>
<div class="container">
<h2>WiFi Settings</h2>
<form id="wifiForm">
  <input type="text" id="ssid" placeholder="SSID" required>
  <input type="password" id="pass" placeholder="Password" required>
  <button type="submit" id="connectBtn">Connect</button>
  <button type="button" id="backBtn" onclick="window.location='/'">Back</button>
</form>
<div id="msg"></div>
</div>
<script>
document.getElementById('wifiForm').onsubmit = function(e){
  e.preventDefault();
  let ssid = document.getElementById('ssid').value;
  let pass = document.getElementById('pass').value;
  fetch('/connect?ssid='+encodeURIComponent(ssid)+'&pass='+encodeURIComponent(pass))
    .then(r=>r.text()).then(msg=>{
      document.getElementById('msg').innerText=msg;
    });
};
</script>
</body>
</html>
  )rawliteral";
}


// ========== Handlers ==========
void handleRoot() { server.send(200, "text/html", mainPage()); }

// void handleToggle() {
//   int led = server.arg("led").toInt();
//   if (led == 1) {
//      led1_state = !led1_state;
//       if (led1_state) {
//         glob_var = 0;
//         Serial.println("LED ON");
//       } else {
//         glob_var = 2;
//         Serial.println("LED OFF");
//       }  
//   }
//   else if (led == 2){
//     led2_state = !led2_state;
//     if (led2_state) {
//       glob_var = 1;
//       Serial.println("NEON ON");
//     } else {
//       glob_var = 2;
//       Serial.println("NEON OFF");
//     }
    
//   }
//   server.send(200, "application/json",
//     "{\"led1\":\"" + String(led1_state ? "ON":"OFF") +
//     "\",\"led2\":\"" + String(led2_state ? "ON":"OFF") + "\"}");
// }

void handleSensors() {
  float t = glob_temperature;
  float h = glob_humidity;
  float l = glob_lightPercent;
  String json = "{\"temp\":"+String(t)+",\"hum\":"+String(h)+",\"light\":"+String(l)+"}";
  server.send(200, "application/json", json);
}

void handleSettings() { server.send(200, "text/html", settingsPage()); }

void handleConnect() {
  wifi_SSID = server.arg("ssid");
  wifi_PASS = server.arg("pass");
  server.send(200, "text/plain", "Connecting....");
  isAPMode = false;
  connecting = true;
  connect_start_ms = millis();
  connectToWiFi();
}

// ========== WiFi ==========
void setupServer() {
  server.on("/", HTTP_GET, handleRoot);
  //server.on("/toggle", HTTP_GET, handleToggle);
  server.on("/sensors", HTTP_GET, handleSensors);
  server.on("/settings", HTTP_GET, handleSettings);
  server.on("/connect", HTTP_GET, handleConnect);
  server.begin();
}

void startAP() {
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid.c_str(), password.c_str());
  Serial.print("AP IP address: ");
  Serial.println(WiFi.softAPIP());
  isAPMode = true;
  connecting = false;
}

void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifi_SSID.c_str(), wifi_PASS.c_str());
  WiFi.softAPdisconnect(true);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);
  Serial.print("Connecting to: ");
  Serial.println(wifi_SSID);
  Serial.print("Password: ");
  Serial.println(wifi_PASS);
}

// ========== Main task ==========
void main_server_task(void *pvParameters){
  pinMode(BOOT_PIN, INPUT_PULLUP);

  startAP();
  setupServer();

  while(1){
    server.handleClient();

    // BOOT Button to switch to AP Mode
    if (digitalRead(BOOT_PIN) == LOW) {
      if (pressStart == 0) pressStart = millis();
        if (millis() - pressStart > 3000) {  // nhấn giữ 3 giây
            if (!isAPMode) {
                Serial.println("Button long press → switching to AP mode");
                startAP();
                setupServer();
            }
        }
    } else pressStart = 0;

    // STA Mode
    if (connecting) {
      if (WiFi.status() == WL_CONNECTED) {
        WiFi.softAPdisconnect(true);
        Serial.print("STA IP address: ");
        Serial.println(WiFi.localIP());
        isAPMode = false;
        connecting = false;
      } else if (millis() - connect_start_ms > 20000) { // timeout 20s
        Serial.println("WiFi connect failed! Back to AP.");
        startAP();
        setupServer();
        connecting = false;
      }
    }

    vTaskDelay(20); // avoid watchdog reset
  }
}

