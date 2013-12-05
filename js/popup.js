var btc_sign = "฿";
var ltc_sign = "Ł";
var cny_sign = "￥";

function showTicker(market, coinType) {
	var tr;
	var m = g_markets[market];
	if (m == undefined) return;
	var coin = m.coins[coinType];
	//console.log(coin);
	if (coin == undefined) return;
	var ticker = coin.ticker;
	console.log(ticker);
	if (ticker == undefined) return;

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
		sign = ltc_sign
	}
	var buy = $("tbody#depth-buy");
	buy.empty();
	var sell = $("tbody#depth-sell");
	sell.empty();

	var m = g_markets[market];
	if (m == undefined) return;
	var coin = m.coins[coinType];
	console.log(coin);
	if (coin == undefined) return;
	var depth = coin.depth;
	console.log(depth);
	if (depth == undefined) return;

	var asks = depth['asks']
	var bids = depth['bids']
	//console.log(key, d.length);


	for (var i = 0; i < 10; i++) {
		var tr = $("<tr/>");

		var price = $("<td/>").text(cny_sign + bids[i][0]).css("color", "green");
		tr.append(price);
		tr.append($("<td/>").text(sign + bids[i][1]));
		buy.append(tr);
	}

	for (var i = asks.length - 1; i >= asks.length - 10; i--) {
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
	var t = $("tbody#trades");
	t.empty();

	var m = g_markets[market];
	if (m == undefined) return;
	var coin = m.coins[coinType];
	if (coin == undefined) return;
	var trades = coin.trades;
	if (trades == undefined || trades.length == 0) return;
	console.log(trades.length);


	for (var i = trades.length - 1; i >= trades.length - 10; i--) {
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

function refresh() {

}

$(document).ready(function(){
	var btcTicker = $("tr#btc-ticker");
	var ltcTicker = $("tr#ltc-ticker");

	loadOptions(function(){
		loadMarket(market_okcoin, function(){
			showTicker(g_options.market, coin_btc);
			showTicker(g_options.market, coin_ltc);
			showDepth(g_options.market, g_options.coin_type);
			showTrades(g_options.market, g_options.coin_type);
		});
	});


	btcTicker.mouseover(function(){
		showTicker(g_options.market, coin_btc);
		showTicker(g_options.market, coin_ltc);
		showDepth(g_options.market, coin_btc);
		showTrades(g_options.market, coin_btc);
	});
	btcTicker.click(function(){
		getTicker(g_options.market, coin_btc, function(){showTicker(g_options.market, coin_btc);});
		getDepth(g_options.market, coin_btc, function(){showDepth(g_options.market, coin_btc);});
		getTrades(g_options.market, coin_btc, function(){showTrades(g_options.market, coin_btc);});
	});

	ltcTicker.mouseover(function(){
		showTicker(g_options.market, coin_btc);
		showTicker(g_options.market, coin_ltc);
		showDepth(g_options.market, coin_ltc);
		showTrades(g_options.market, coin_ltc);
	});
	ltcTicker.click(function(){
		getTicker(g_options.market, coin_ltc, function(){showTicker(g_options.market, coin_ltc);});
		getDepth(g_options.market, coin_ltc, function(){showDepth(g_options.market, coin_ltc);});
		getTrades(g_options.market, coin_ltc, function(){showTrades(g_options.market, coin_ltc);});
	});
});

