// Legacy support for pre-event-pages.
var oldChromeVersion = !chrome.runtime;
var requestTimerId;
var requestTimeout = 1000 * 15;  // seconds

var markets = {};
var m_okcoin = new Market(market_okcoin);
m_okcoin.addCoin(new Coin(coin_btc));	// add bitcoin
m_okcoin.addCoin(new Coin(coin_ltc));	// add litecoin
m_okcoin.addAPI("base", "http://www.okcoin.com/api");
m_okcoin.addAPI("ticker_btc", "/ticker.do");
m_okcoin.addAPI("ticker_ltc", "/ticker.do?symbol=ltc_cny");
m_okcoin.addAPI("depth_btc", "/depth.do");
m_okcoin.addAPI("depth_ltc", "/depth.do?symbol=ltc_cny");
m_okcoin.addAPI("trades_btc", "/trades.do");
m_okcoin.addAPI("trades_ltc", "/trades.do?symbol=ltc_cny");

markets[m_okcoin.name] = m_okcoin;	// add okcoin support
console.log(m_okcoin);


function save(key, value) {
	var o = {};
	
	o[key] = value;
	chrome.storage.local.set(o, function(){
		console.log(key, "saved!");
	});
}

function setIcon(oldValue, newValue) {
		oldValue = parseFloat(oldValue);
		newValue = parseFloat(newValue);
		console.log("setIcon", options.market, options.coin_type, oldValue, resp.ticker.last);
		
		if (oldValue < newValue) {
			chrome.browserAction.setBadgeBackgroundColor({color:"#00AA00"});
		} else if (oldValue > newValue) {
			chrome.browserAction.setBadgeBackgroundColor({color:"#AA0000"});
		} else {
			chrome.browserAction.setBadgeBackgroundColor({color:"#0000AA"});
		}
		chrome.browserAction.setBadgeText({text:newValue});
		
		//notify(newValue);
}

function getTicker(market, coinType) {
	console.log("getTicker", market, coinType);
	
	var m = markets[market];
	if (m == undefined) return;
	
	var coin = m.getCoin(coinType);
	//console.log(coin);
	if (coin == undefined) return;
	
	var url = m.getTickerUrl(coinType);
	//console.log(url);
	request(url, 
		function(resp) {
			
			var oldValue = 0;
			if (m.name == options.market && coin.type == options.coin_type) {
				var t = coin.ticker;
				if (t != undefined) oldValue = t.last;
				setIcon(oldValue, resp.ticker.last);
			}
			
			coin.setTicker(resp.ticker);
			save(market, m);
			console.log('get ticker', coinType, 'success!');
		},
		function() {
			console.log('get ticker', coinType, "error");
		}
	);
}

function getDepth(market, coinType) {
	console.log("getDepth", market, coinType);
	
	var m = markets[market];
	if (m == undefined) return;
	
	var coin = m.getCoin(coinType);
	if (coin == undefined) return;
	
	var url = m.getDepthUrl(coinType);
	request(url, 
		function(resp) {
			coin.setDepth(resp);
			save(market, m);
			console.log('get depth', coinType, 'success!');
		},
		function() {
			console.log('get depth', coinType, "error");
		}
	);
}

function getTrades(market, coinType) {
	console.log("getTrades", market, coinType);
	
	var m = markets[market];
	if (m == undefined) return;
	
	var coin = m.getCoin(coinType);
	if (coin == undefined) return;
	
	var url = m.getTradesUrl(coinType);
	request(url, 
		function(resp) {
			coin.setTrades(resp);
			save(market, m);
			console.log('get trades', coinType, 'success!');
		},
		function() {
			console.log('get trades', coinType, "error");
		}
	);
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


function scheduleRequest() {
	delay = options.interval;
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
	loadOptions();
	
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
	startRequest({scheduleRequest:true});
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

