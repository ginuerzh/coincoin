// Legacy support for pre-event-pages.
var oldChromeVersion = !chrome.runtime;
var requestTimerId;
var requestTimeout = 1000 * 15;  // seconds

var type_btc = "btc";
var type_ltc = "ltc"

var coin_type_key = "show_coin_type";
var interval_key = "update_interval";
var price_low_key = "notify_low_price";
var price_high_key = "notify_high_price";

var okcoin_btc_ticker_key = "okcoin_btc_ticker"
var okcoin_ltc_ticker_key = "okcoin_ltc_ticker"

var options = {};
options[interval_key] = 1;


function scheduleRequest() {
	delay = options[interval_key];
	console.log('scheduleRequest delay', delay);
	
	if (oldChromeVersion) {
		if (requestTimerId) {
			window.clearTimeout(requestTimerId);
		}
		requestTimerId = window.setTimeout(onAlarm, delay*60*1000);
	} else {
		console.log('Creating alarm');
		// Use a repeating alarm so that it fires again if there was a problem
		// setting the next alarm.
		chrome.alarms.create('refresh', {periodInMinutes: delay});
	}
}

function request(url, onSuccess, onError) {
	var xhr = new XMLHttpRequest();
	var abortTimerId = window.setTimeout(function() {
		console.log(url, "timeout")
		xhr.abort();  // synchronously calls onreadystatechange
	}, requestTimeout);
	
	function handleSuccess(r) {
		window.clearTimeout(abortTimerId);
		if (onSuccess)
			onSuccess(r);
	};
	
	var invokedErrorCallback = false;
	function handleError() {
		window.clearTimeout(abortTimerId);
		if (onError && !invokedErrorCallback)
			onError();
		invokedErrorCallback = true;
	};
	
	try {
		xhr.onreadystatechange = function() {
			if (xhr.readyState != 4)
				return;
			
			if (xhr.responseText) {
				try {
					var r = JSON.parse(xhr.responseText);
					handleSuccess(r);
					return;
				} catch(e) {
					console.error(chrome.i18n.getMessage("okcoin_exception", e));
				}
			}
			
			handleError();
		};
		
		xhr.onerror = function(error) {
			handleError();
		};
		
		xhr.open("GET", url, true);
		xhr.send(null);
	} catch(e) {
		console.error(chrome.i18n.getMessage("okcoin_exception", e));
		handleError();
	}
}

function getTicker(type) {
	var key = okcoin_btc_ticker_key;
	var url = "http://www.okcoin.com/api/ticker.do";
	
	if (type == type_ltc) {
		key = okcoin_ltc_ticker_key;
		url += "?symbol=ltc_cny";
	}
	
	request(url, 
			function(resp) {
				console.log('store', key, resp.ticker);
				
				var ticker = {};
				ticker[key] = resp.ticker;
				chrome.storage.local.set(ticker);
			},
			function() {
				console.log(key, "error");
			}
		);
}

function getDepth(type) {
	var key = "okcoin_btc_depth";
	var url = "http://www.okcoin.com/api/depth.do";
	
	if (type == type_ltc) {
		key = "okcoin_ltc_depth";
		url += "?symbol=ltc_cny";
	}
	
	request(url, 
		function(resp) {
			console.log('store', key, resp);
			var depth = {};
			depth[key] = resp;
			chrome.storage.local.set(depth);
		},
		function() {
			console.log(key, "error");
		}
	);
}

function getTrades(type) {
	var key = "okcoin_btc_trades";
	var url = "http://www.okcoin.com/api/trades.do";
	
	if (type == type_ltc) {
		key = "okcoin_ltc_trades";
		url += "?symbol=ltc_cny";
	}
	
	request(url,
		function(resp) {
			console.log('store', key, resp);
			var trades = {};
			trades[key] = resp;
			chrome.storage.local.set(trades);
		},
		function() {
			console.log(key, "error");
		}
	);
}

function startRequest(params) {
	if (params && params.scheduleRequest) scheduleRequest();
	
	// get okcoin btc ticker
	getTicker(type_btc);
	// get okcoin ltc ticker
	getTicker(type_ltc);
	
	// get okcoin btc market depth
	getDepth(type_btc);
	// get okcoin ltc market depth
	getDepth(type_ltc);
	
	// get trades
	getTrades(type_btc);
	getTrades(type_ltc)
}

function onAlarm(alarm) {
	console.log('Got alarm', alarm);
	// |alarm| can be undefined because onAlarm also gets called from
	// window.setTimeout on old chrome versions.
	if (alarm && alarm.name == 'watchdog') {
		onWatchdog();
	} else {
		startRequest({scheduleRequest:true});
	}
}

function onWatchdog() {
	chrome.alarms.get('refresh', function(alarm) {
		if (alarm) {
			console.log('Refresh alarm exists. Yay.');
		} else {
			console.log('Refresh alarm doesn\'t exist!? ' +
						'Refreshing now and rescheduling.');
			startRequest({scheduleRequest:true});
		}
	});
}

function loadOptions() {
	var keys = {};
	keys[coin_type_key] = "btc";
	keys[interval_key] = 1;
	keys[price_low_key] = 0;
	keys[price_high_key] = 0;
	
	chrome.storage.local.get(keys, function(items){
		console.log("load options", items);
		options = items;
	});
}

function onInit() {
	console.log('onInit');
	loadOptions();
	startRequest({scheduleRequest:true});
}

chrome.storage.onChanged.addListener(function(changes, namespace) {
	console.log(changes)
	for (key in changes) {
		var storageChange = changes[key];
		/*console.log('Storage key "%s" in namespace "%s" changed. ' +
                'Old value was "%s", new value is "%s".',
                key,
                namespace,
                storageChange.oldValue,
                storageChange.newValue);*/
        
		options[key] = storageChange.newValue;
		
        if (key == okcoin_ltc_ticker_key && options[coin_type_key] == type_ltc ||
			key == okcoin_btc_ticker_key && options[coin_type_key] == type_btc) {
			var oldValue = parseFloat(storageChange.oldValue.last);
			var newValue = parseFloat(storageChange.newValue.last);
			if (oldValue < newValue) {
				chrome.browserAction.setBadgeBackgroundColor({color:"#00AA00"});
			} else if (oldValue > newValue) {
				chrome.browserAction.setBadgeBackgroundColor({color:"#AA0000"});
			} else {
				chrome.browserAction.setBadgeBackgroundColor({color:"#0000AA"});
			}
			
			chrome.browserAction.setBadgeText({text:storageChange.newValue.last});
		}
		
		if (key == coin_type_key) {
			var value;
			if (storageChange.newValue == type_btc && options[okcoin_btc_ticker_key] != undefined) {
				value = options[okcoin_btc_ticker_key].last
			}
			
			if (storageChange.newValue == type_ltc && options[okcoin_ltc_ticker_key] != undefined) {
				value = options[okcoin_ltc_ticker_key].last
			}
			chrome.browserAction.setBadgeText({text:value});
			
		}
		
	}
});

if (oldChromeVersion) {
	onInit();
} else {
	chrome.runtime.onInstalled.addListener(onInit);
	chrome.alarms.onAlarm.addListener(onAlarm);
}

if (chrome.runtime && chrome.runtime.onStartup) {
	chrome.runtime.onStartup.addListener(function() {
		console.log('Starting browser...');
	});
} else {
	chrome.windows.onCreated.addListener(function() {
		console.log('Window created...');
	});
}

