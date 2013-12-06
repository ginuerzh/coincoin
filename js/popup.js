var btc_sign = "฿";
var ltc_sign = "Ł";
var cny_sign = "￥";

var options = chrome.extension.getBackgroundPage().getOptions();
var market = chrome.extension.getBackgroundPage().getMarket(options.market);

var coin_display = options.coin_type;


function showTicker(market, coinType) {
	var tr;

	if (!market || !market.getCoin(coinType) || !market.getCoin(coinType).ticker) return;

	var ticker = market.getCoin(coinType).ticker;
	//console.log(ticker);
	if (coinType == coin_btc) {
		tr = $("tr#btc-ticker");
	} else {
		tr = $("tr#ltc-ticker");
	}

	tr.find(".last").text(ticker.last);
	tr.find(".buy").text(ticker.buy);
	tr.find(".sell").text(ticker.sell);
	tr.find(".high").text(ticker.high);
	tr.find(".low").text(ticker.low);
	tr.find(".vol").text(ticker.vol.toFixed(2));
}

function showDepth(market, coinType) {
	var sign = btc_sign;
	if (coinType == coin_ltc) {
		sign = ltc_sign;
	}

	if (coin_display != coinType ||
		!market || !market.getCoin(coinType) || !market.getCoin(coinType).depth) return;
	var depth = market.getCoin(coinType).depth;
	//console.log(depth);

	var asks = depth['asks'];
	var bids = depth['bids'];
	//console.log(key, d.length);

	var buy = $("tbody#depth-buy");
	buy.empty();
	var sell = $("tbody#depth-sell");
	sell.empty();

	for (var i = 0; i < options.table_length; i++) {
		var tr = $("<tr/>");

		var price = $("<td/>").text(cny_sign + bids[i][0]).css("color", "green");
		tr.append(price);
		tr.append($("<td/>").text(sign + bids[i][1]));
		buy.append(tr);
	}

	for (var i = asks.length - 1; i >= asks.length - options.table_length; i--) {
		var tr = $("<tr/>");

		var price = $("<td/>").text(cny_sign + asks[i][0]).css("color", "red");
		tr.append(price);
		tr.append($("<td/>").text(sign + asks[i][1]));
		sell.append(tr);
	}
}

function showTrades(market, coinType) {
	var sign = btc_sign;
	if (coinType == coin_ltc) {
		sign = ltc_sign;
	}

	if (coin_display != coinType ||
		!market || !market.getCoin(coinType) || !market.getCoin(coinType).trades) return;
	var trades = market.getCoin(coinType).trades;
	if (trades.length < options.table_length) return;

	var t = $("tbody#trades");
	t.empty();

	for (var i = trades.length - 1; i >= trades.length - options.table_length; i--) {
		var tr = $("<tr/>");

		var date = new Date();
		date.setTime(trades[i].date * 1000);
		tr.append($("<td/>").text(date.format("hh:mm:ss")));

		var price = $("<td/>").text(cny_sign + trades[i].price)
		if (trades[i].type == "buy") {
			price.css("color", "green");
		} else {
			price.css("color", "red");
		}
		tr.append(price);
		tr.append($("<td/>").text(sign + trades[i].amount));
		t.append(tr);
	}
}

function showMarket(market, coinType) {
	showTicker(market, coin_btc);
	showTicker(market, coin_ltc);
	if (options.table_length > 0) {
		showDepth(market, coinType);
		showTrades(market, coinType);
	}
}

function initMarkets(markets) {
	var elems = $(".markets");
	console.log(elems.length);
	for (var i = 0; i < elems.length; i++) {
		var id = $(elems[i]).attr("id");
		console.log(id, markets[id]);
		if (!markets[id]) {
			$(elems[i]).hide();
		}
	}
}

$(document).ready(function(){
	var btcTicker = $("tr#btc-ticker");
	var ltcTicker = $("tr#ltc-ticker");

	console.log("background market", market);
	console.log("background options", options)

	if (options.table_length == 0) {
		$("#depth-trades").hide();
	}

	initMarkets(options.markets);
	showMarket(market, coin_display);

	btcTicker.mouseover(function(){
		coin_display = coin_btc;
		showMarket(market, coin_btc);
	});
	btcTicker.click(function(){
		chrome.extension.getBackgroundPage().getMarketInfo(options.market, coin_btc);
	});

	ltcTicker.mouseover(function(){
		coin_display = coin_ltc;
		showMarket(market, coin_ltc);
	});
	ltcTicker.click(function(){
		chrome.extension.getBackgroundPage().getMarketInfo(options.market, coin_ltc);
	});

	chrome.runtime.onMessage.addListener(
	function(message, sender, sendResponse) {
		//console.log(message);
		if (message.action == "update") {
			if (message.info == "ticker") {
				showTicker(market, message.coin);
			} else if (message.info == "depth") {
				showDepth(market, message.coin);
			} else if (message.info == "trades") {
				showTrades(market, message.coin);
			} else {
				console.error("unknown info", message.info);
			}

			//showMarket(market, message.coin);
		  //sendResponse({farewell: "goodbye"});
		}
	});
});

