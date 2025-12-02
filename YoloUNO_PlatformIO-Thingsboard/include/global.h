#ifndef __GLOBAL_H__
#define __GLOBAL_H__
#include <ThingsBoard.h>
extern float glob_temperature;
extern float glob_humidity;
extern float glob_lightPercent;
extern String wifi_ssid;
extern String wifi_pass;
extern String cur_SSID;
extern String cur_PASS;
extern volatile bool wifiReconnectRequested;


#endif