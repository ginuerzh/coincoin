// Legacy support for pre-event-pages.
var oldChromeVersion = !chrome.runtime;
var requestTimerId;


var m_okcoin = new Market(market_okcoin);
m_okcoin.addCoin(new Coin(coin_btc));	// add bitcoin
m_okcoin.addCoin(new Coin(coin_ltc));	// add litecoin
m_okcoin.setAPIs(g_apis[market_okcoin]);
g_markets[m_okcoin.name] = m_okcoin;	// add okcoin support


function scheduleRequest() {
	delay = g_options.interval;
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

function startRequest(params) {
	console.log("startRequest");

	if (params && params.scheduleRequest) scheduleRequest();

	// get okcoin btc ticker
	getTicker(market_okcoin, coin_btc);
	// get okcoin ltc ticker
	getTicker(market_okcoin, coin_ltc);

	// get okcoin btc market depth
	getDepth(market_okcoin, coin_btc);
	// get okcoin ltc market depth
	getDepth(market_okcoin, coin_ltc);

	// get trades
	getTrades(market_okcoin, coin_btc);
	getTrades(market_okcoin, coin_ltc)
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


function onInit() {
	console.log('onInit');
	loadOptions(function(){
		startRequest({scheduleRequest:true});
	});
}

function notify(newValue) {
	var nid = "1";
	var b = false;

	var opt = {
		type: "basic"
	};

	var low_price = parseFloat(options[price_low_key]);
	var	high_price = parseFloat(options[price_high_key]);

	if (low_price > high_price) {
		var tmp = low_price;
		low_price = high_price;
		high_price = tmp;
	}

	if (options[coin_type_key] == type_btc) {
		opt.title = "BTC价格提醒";
		opt.iconUrl = "images/btc.png";
	} else {
		opt.title = "LTC价格提醒";
		opt.iconUrl = "images/ltc.png";
	}
	if (newValue < low_price) {
		opt.message = "当前价格" + newValue + "低于设定的价格" + low_price;
		b = true;
	}
	if (newValue > high_price) {
		opt.message = "当前价格" + newValue + "高于设定的价格" + high_price;
		b = true;
	}

	if (b) {
		console.log(options[coin_type_key], "notification", newValue);
		chrome.notifications.create(nid, opt, function(notificationId){
			console.log(notificationId);
		});
	}
}

chrome.storage.onChanged.addListener(function(changes, namespace) {
	for (key in changes) {
		var storageChange = changes[key];
		/*console.log('Storage key "%s" in namespace "%s" changed. ' +
                'Old value was "%s", new value is "%s".',
                key,
                namespace,
                storageChange.oldValue,
                storageChange.newValue);*/

        /*
		if (key == coin_type_key) {
			var value;
			if (storageChange.newValue == type_btc && options[okcoin_btc_ticker_key] != undefined) {
				value = options[okcoin_btc_ticker_key].last;
			}

			if (storageChange.newValue == type_ltc && options[okcoin_ltc_ticker_key] != undefined) {
				value = options[okcoin_ltc_ticker_key].last;
			}
			console.log("change to", storageChange.newValue, value);
			chrome.browserAction.setBadgeText({text:value});
		}
		*/
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

