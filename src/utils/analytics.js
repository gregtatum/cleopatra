"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
exports.__esModule = true;
exports.reportError = exports.sendAnalytics = void 0;
'event',
    // Specifies the event category. Must not be empty
    eventCategory;
string,
    eventAction;
string,
    eventLabel ?  : string,
    eventValue ?  : number,
;
;
'pageview',
    page;
string,
;
;
'timing',
    timingCategory;
string,
    timingVar;
string,
    timingValue;
number,
    timingLabel ?  : string,
;
;
+exDescription;
string,
    +exFatal;
boolean,
;
;
GAPayload;
void ;
'exception', GAErrorPayload;
void ;
function sendAnalytics(payload) {
    var ga = self.ga;
    if (ga) {
        ga('send', payload);
    }
}
exports.sendAnalytics = sendAnalytics;
function reportError(errorPayload) {
    var ga = self.ga;
    if (ga) {
        ga('send', 'exception', errorPayload);
    }
}
exports.reportError = reportError;
