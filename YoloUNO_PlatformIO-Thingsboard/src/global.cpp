#include "global.h"
float glob_temperature = 0;
float glob_humidity = 0;
float glob_lightPercent = 0;
String wifi_ssid = "";
String wifi_pass = "";
String cur_SSID = "";
String cur_PASS = "";
volatile bool wifiReconnectRequested = false;
