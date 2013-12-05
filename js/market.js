var requestTimeout = 1000 * 15;  // seconds

var coin_btc = "btc";
var coin_ltc = "ltc"
var market_okcoin = 'okcoin';


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

Date.prototype.format =function(format)
{
	var o = {
		"M+" : this.getMonth()+1, //month
		"d+" : this.getDate(),    //day
		"h+" : this.getHours(),   //hour
		"m+" : this.getMinutes(), //minute
		"s+" : this.getSeconds(), //second
		"q+" : Math.floor((this.getMonth()+3)/3),  //quarter
		"S" : this.getMilliseconds() //millisecond
	}
	if(/(y+)/.test(format)) format=format.replace(RegExp.$1,
	(this.getFullYear()+"").substr(4- RegExp.$1.length));
	for(var k in o)
		if(new RegExp("("+ k +")").test(format))
			format = format.replace(RegExp.$1, RegExp.$1.length==1 ? o[k] : ("00"+ o[k]).substr((""+ o[k]).length));
    return format;
}


function Options() {
	this.market = market_okcoin;
	this.coin_type = coin_ltc;
	this.interval = 1;
	this.low_price = 0;
	this.high_price = 0;
}

var g_options = new Options();

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

function getFloat(v) {
	var f = parseFloat(v);
	if (isNaN(f))
		return 0;
	else
		return f;
}

function Ticker(t) {
	this.high = getFloat(t.high);
	this.low = getFloat(t.low);
	this.buy = getFloat(t.buy);
	this.sell = getFloat(t.sell);
	this.last = getFloat(t.last);
	this.vol = getFloat(t.vol);

	if (typeof Ticker._initialized == "undefined") {
		Ticker.prototype.toString = function() {
			return "high:" + this.high +
				   ", low:" + this.low +
				   ", buy:" + this.buy +
				   ", sell:" + this.sell +
				   ", last:" + this.last +
				   ", vol:" + this.vol;
		}
		Ticker._initialized = true;
	}
}

function Depth(o) {
	this.asks = o.asks;
	this.bids = o.bids;
}

function Trade(o) {
	this.date = o.date;
	this.price = o.price;
	this.amount = o.amount;
	this.type = o.type;
}

function Coin(type) {
	this.type = type;
	this.trades = new Array();

	if (typeof Coin._initialized == "undefined") {
		Coin.prototype.setTicker = function(t) {
			this.ticker = new Ticker(t);
		}
		Coin.prototype.setDepth = function(d) {
			this.depth = new Depth(d);
		}
		Coin.prototype.addTrades = function(t) {
			this.trades.push(t);
		}
		Coin.prototype.setTrades = function(t) {
			this.trades = t;
		}

		Coin._initialized = true;
	}
}

function Market(name) {
	this.name = name;
	this.apis = {};
	this.coins = {};

	if (typeof Market._initialized == "undefined") {
		Market.prototype.addCoin = function(coin) {
			//console.log("add coin", coin.type, coin);
			this.coins[coin.type] = coin;
		}
		Market.prototype.getCoin = function(type) {
			return this.coins[type];
		}
		Market.prototype.addAPI = function(name, uri) {
			this.apis[name] = uri;
		}
		Market.prototype.setAPIs = function(apis) {
			this.apis = apis;
		}
		Market.prototype.getTickerUrl = function(coinType) {
			return this.apis.base + this.apis["ticker_" + coinType];
		}
		Market.prototype.getDepthUrl = function(coinType) {
			return this.apis.base + this.apis["depth_" + coinType];
		}
		Market.prototype.getTradesUrl = function(coinType) {
			return this.apis.base + this.apis["trades_" + coinType];
		}

		Market._initialized = true;
	}
}

var g_markets = {};

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


function setIcon(oldValue, newValue) {
	oldValueF = parseFloat(oldValue);
	newValueF = parseFloat(newValue);
	console.log("setIcon", g_options.market, g_options.coin_type, oldValue, newValue);

	if (oldValue < newValue) {
		chrome.browserAction.setBadgeBackgroundColor({color:"#00AA00"});
	} else if (oldValue > newValue) {
		chrome.browserAction.setBadgeBackgroundColor({color:"#AA0000"});
	} else {
		chrome.browserAction.setBadgeBackgroundColor({color:"#0000AA"});
	}
	chrome.browserAction.setBadgeText({text:newValue.toString()});

		//notify(newValue);
}

function save(key, value) {
	var o = {};

	o[key] = value;
	chrome.storage.local.set(o, function(){
		console.log(key, "saved!");
	});
}

function getTicker(market, coinType, onSuccess) {
	console.log("getTicker", market, coinType);

	var m = g_markets[market];

	if (m == undefined) return;

	//var coin = m.getCoin(coinType);
	var coin = m.coins[coinType];
	//console.log(coin);
	if (coin == undefined) return;

	//var url = m.getTickerUrl(coinType);
	var url = m.apis.base + m.apis["ticker_" + coinType];
	console.log(url);
	request(url,
		function(resp) {
			var oldValue = 0;
			if (m.name == g_options.market && coin.type == g_options.coin_type) {
				var t = coin.ticker;
				if (t != undefined) oldValue = t.last;
				console.log(oldValue, resp.ticker.last);
				setIcon(oldValue, resp.ticker.last);
			}

			//coin.setTicker(resp.ticker);
			coin.ticker = new Ticker(resp.ticker);
			save(market, m);
			console.log('get ticker', coinType, 'success!');

			if (onSuccess) {
				onSuccess();
			}
		},
		function() {
			console.log('get ticker', coinType, "error");
		}
	);
}

function getDepth(market, coinType, onSuccess) {
	console.log("getDepth", market, coinType);

	var m = g_markets[market];
	if (m == undefined) return;

	//var coin = m.getCoin(coinType);
	var coin = m.coins[coinType];
	if (coin == undefined) return;

	//var url = m.getDepthUrl(coinType);
	var url = m.apis.base + m.apis["depth_" + coinType];
	request(url,
		function(resp) {
			//coin.setDepth(resp);
			coin.depth = new Depth(resp);
			save(market, m);
			console.log('get depth', coinType, 'success!');

			if (onSuccess) {
				onSuccess();
			}
		},
		function() {
			console.log('get depth', coinType, "error");
		}
	);
}

function getTrades(market, coinType, onSuccess) {
	console.log("getTrades", market, coinType);

	var m = g_markets[market];
	if (m == undefined) return;

	//var coin = m.getCoin(coinType);
	var coin = m.coins[coinType];
	if (coin == undefined) return;

	//var url = m.getTradesUrl(coinType);
	var url = m.apis.base + m.apis["trades_" + coinType];
	request(url,
		function(resp) {
			//coin.setTrades(resp);
			coin.trades = resp;
			save(market, m);
			console.log('get trades', coinType, 'success!');

			if (onSuccess) {
				onSuccess();
			}
		},
		function() {
			console.log('get trades', coinType, "error");
		}
	);
}

