
var coin_btc = "btc";
var coin_ltc = "ltc"
var market_okcoin = 'okcoin';

function Options() {
	this.market = market_okcoin;
	this.coin_type = coin_btc;
	this.interval = 1;
	this.low_price = 0;
	this.high_price = 0;
}
Options.prototype.loaded = false;

var options = new Options();

function loadOptions() {
	if (options.loaded) return;
	
	var opt = {};
	opt.options = options;
	
	chrome.storage.local.get(opt, function(items){
		options = items.options;
		options.loaded = true;
		console.log("load options", options);
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

