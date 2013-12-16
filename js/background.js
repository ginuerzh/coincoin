// Legacy support for pre-event-pages.
var oldChromeVersion = !chrome.runtime;
var requestTimerId;
var requestTimeout = 1000 * 15;  // seconds

var g_options = new Options();
var g_markets = {};
var inited = false;

var g_apis = {};
g_apis[market_okcoin] = {
	base: 		"http://www.okcoin.com/api",
	ticker_btc: "/ticker.do",
	ticker_ltc: "/ticker.do?symbol=ltc_cny",
	depth_btc: 	"/depth.do",
	depth_ltc: 	"/depth.do?symbol=ltc_cny",
	trades_btc: "/trades.do",
	trades_ltc: "/trades.do?symbol=ltc_cny"
};


var m_okcoin = new Market(market_okcoin);
m_okcoin.addCoin(new Coin(coin_btc));	// add bitcoin
m_okcoin.addCoin(new Coin(coin_ltc));	// add litecoin
m_okcoin.setAPIs(g_apis[market_okcoin]);
g_markets[m_okcoin.name] = m_okcoin;	// add okcoin support


function getMarket(market) {
	return g_markets[market];
}

function getOptions() {
	return g_options;
}

function loadOptions(onSuccess) {
	var opt = {};
	opt.options = g_options;

	chrome.storage.local.get(opt, function(items){
		g_options = items.options;
		console.log("load options", g_options);

		if (onSuccess) {
			onSuccess();
		}
	});
}

function loadMarket(market, onSuccess) {
	chrome.storage.local.get(market, function(items){
		var m = items[market];
		if (m == undefined) {
			console.error("market", market, "not found!");
			return;
		}
		
		g_markets[market] = m;
		console.log("loadMarket", market, m);
		if (onSuccess) {
			onSuccess();
		}
	});
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
			if (xhr.readyState != 4 || xhr.status != 200)
				return;

			if (xhr.responseText) {
				try {
					var r = JSON.parse(xhr.responseText);
					handleSuccess(r);
					return;
				} catch(e) {
					//console.error(e);
				}
			}

			handleError();
		};

		xhr.onerror = function(error) {
			//console.error(error);
			handleError();
		};

		xhr.open("GET", url, true);
		xhr.send(null);
	} catch(e) {
		//console.error(e);
		handleError();
	}
}

function getTicker(market, coinType, onSuccess) {
	console.log("getTicker", market, coinType);

	if (!getMarket(market) || !getMarket(market).getCoin(coinType)) return;
	var coin = getMarket(market).getCoin(coinType);
	var url = getMarket(market).getTickerUrl(coinType);
	//console.log(url);
	
	request(url,
		function(resp) {
			var oldValue = 0;
			if (market == g_options.market && coin.type == g_options.coin_type) {
				var t = coin.ticker;
				if (t) oldValue = t.last;
				//console.log(oldValue, resp.ticker.last);
				setIcon(oldValue, resp.ticker.last);
			}

			coin.ticker = new Ticker(resp.ticker);
			console.log('get ticker', coinType, 'success!');

			if (onSuccess) {
				onSuccess();
			}
			
			chrome.runtime.sendMessage({action: "update", market: market, coin: coinType, info: "ticker"});
		},
		function() {
			console.log('get ticker', coinType, "error");
		}
	);
}

function getDepth(market, coinType, onSuccess) {
	console.log("getDepth", market, coinType);

	if (!getMarket(market) || !getMarket(market).getCoin(coinType)) return;
	var coin = getMarket(market).getCoin(coinType);
	var url = getMarket(market).getDepthUrl(coinType);
	//console.log(url);
	
	request(url,
		function(resp) {
			coin.setDepth(resp);
			console.log('get depth', coinType, 'success!');

			if (onSuccess) {
				onSuccess();
			}
			
			chrome.runtime.sendMessage({action: "update", market: market, coin: coinType, info: "depth"});
		},
		function() {
			console.log('get depth', coinType, "error");
		}
	);
}

function getTrades(market, coinType, onSuccess) {
	console.log("getTrades", market, coinType);

	if (!getMarket(market) || !getMarket(market).getCoin(coinType)) return;
	var coin = getMarket(market).getCoin(coinType);
	var url = getMarket(market).getTradesUrl(coinType);
	//console.log(url);
	
	request(url,
		function(resp) {
			coin.setTrades(resp);
			console.log('get trades', coinType, 'success!');

			if (onSuccess) {
				onSuccess();
			}
			
			chrome.runtime.sendMessage({action: "update", market: market, coin: coinType, info: "trades"});
		},
		function() {
			console.log('get trades', coinType, "error");
		}
	);
}

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

function getMarketInfo(market, coinType) {
	getTicker(market, coinType);
	getDepth(market, coinType);
	getTrades(market, coinType);
}

function startRequest(params) {
	console.log("startRequest");

	if (params && params.scheduleRequest) scheduleRequest();

	getMarketInfo(g_options.market, coin_btc);
	getMarketInfo(g_options.market, coin_ltc);
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
	if (inited) return;
	console.log('onInit');
	loadOptions(function(){
		startRequest({scheduleRequest:true});
	});
	inited = true;
}

function notify(newValue) {
	var nid = "1";
	var b = false;

	var opt = {
		type: "basic"
	};

	var low_price = parseFloat(g_options.low_price);
	var	high_price = parseFloat(g_options.high_price);
	
	if (low_price > high_price) {
		var tmp = low_price;
		low_price = high_price;
		high_price = tmp;
	}

	if (g_options.coin_type == coin_btc) {
		opt.title = "BTC价格提醒";
		opt.iconUrl = "images/btc.png";
	} else {
		opt.title = "LTC价格提醒";
		opt.iconUrl = "images/ltc.png";
	}
	if (low_price > 0 && newValue < low_price) {
		opt.message = "当前价格" + newValue + "低于设定的价格" + low_price;
		b = true;
	}
	if (high_price > 0 && newValue > high_price) {
		opt.message = "当前价格" + newValue + "高于设定的价格" + high_price;
		b = true;
	}

	if (b) {
		console.log(g_options.coin_type, "notification", newValue);
		chrome.notifications.create(nid, opt, function(notificationId){
			console.log(notificationId);
		});
	}
}

function setIcon(oldValue, newValue) {
	oldValueF = parseFloat(oldValue);
	newValueF = parseFloat(newValue);
	if (isNaN(oldValueF)) oldValueF = 0;
	if (isNaN(newValueF)) newValueF = 0;

	if (g_options.coin_type == coin_btc)
		chrome.browserAction.setIcon({path:"images/btc.png"});
	else
		chrome.browserAction.setIcon({path:"images/ltc.png"});

	if (oldValueF < newValueF) {
		chrome.browserAction.setBadgeBackgroundColor({color:"#00AA00"});
	} else if (oldValueF > newValueF) {
		chrome.browserAction.setBadgeBackgroundColor({color:"#AA0000"});
	} else {
		chrome.browserAction.setBadgeBackgroundColor({color:"#0000AA"});
	}
	chrome.browserAction.setBadgeText({text:newValueF.toString()});
	
	notify(newValueF);
}


chrome.storage.onChanged.addListener(function(changes, namespace) {
	for (key in changes) {
		var storageChange = changes[key];
		console.log('Storage key "%s" in namespace "%s" changed.', key, namespace);
		//console.log(storageChange.oldValue, storageChange.newValue);

		if (key == options_key) {
			if (!getMarket(g_options.market) || 
				!getMarket(g_options.market).getCoin(g_options.coin_type) ||
				!getMarket(g_options.market).getCoin(g_options.coin_type).ticker) {
					return;
			}
		
			var ticker = getMarket(g_options.market).getCoin(g_options.coin_type).ticker;
			setIcon(0, ticker.last);
			
			
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
		onInit();
	});
} else {
	chrome.windows.onCreated.addListener(function() {
		console.log('Window created...');
		onInit();
	});
}

