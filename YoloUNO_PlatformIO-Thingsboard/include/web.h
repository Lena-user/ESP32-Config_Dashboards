#ifndef ___MAIN_SERVER__
#define ___MAIN_SERVER__
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <global.h>

#define LED1_PIN 48
#define LED2_PIN 41
#define BOOT_PIN 0
//extern WebServer server;

//extern bool isAPMode;
extern String wifi_SSID;
extern String wifi_PASS;



String mainPage();
String settingsPage();
static unsigned long pressStart = 0;
void startAP();
void setupServer();
void connectToWiFi();
void main_server_task(void *pvParameters);

#endif