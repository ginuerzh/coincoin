var btc_sign = "฿";
var ltc_sign = "Ł";
var cny_sign = "￥";
var type_btc = "btc";
var type_ltc = "ltc"

var requestTimeout = 1000 * 15; // seconds

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


function request(url, onSuccess, onError) {
	console.log(url);
	
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
	var key = "okcoin_btc_ticker";
	var url = "http://www.okcoin.com/api/ticker.do";
	
	if (type == type_ltc) {
		key = "okcoin_ltc_ticker";
		url += "?symbol=ltc_cny";
	}
	
	request(url, 
			function(resp) {
				console.log('store', key, resp.ticker);
				
				var ticker = {};
				ticker[key] = resp.ticker;
				chrome.storage.local.set(ticker);
				loadTicker(type);
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
			showDepth(type);
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
			showTrades(type);
		},
		function() {
			console.log(key, "error");
		}
	);
}


function showTicker(type, ticker) {
	var tr;
	if (type == type_btc) {
		tr = $("tr#btc-ticker");
	} else {
		tr = $("tr#ltc-ticker");
	}
	 
	tr.find(".last").text(ticker.last);
	tr.find(".buy").text(ticker.buy);
	tr.find(".sell").text(ticker.sell);
	tr.find(".high").text(ticker.high);
	tr.find(".low").text(ticker.low);
	
	var vol = new Number(parseFloat(ticker.vol));
	tr.find(".vol").text(vol.toFixed(2));
}

function loadTicker(type) {
	var key = "okcoin_btc_ticker";
	if (type == type_ltc) {
		key = "okcoin_ltc_ticker";
	}
	
	chrome.storage.local.get(key, function(items) {
		var t = items[key];
		
		console.log(key, t);
		showTicker(type, t);
	});
}

function showDepth(type) {
	var sign = btc_sign;
	var key = "okcoin_btc_depth";
	if (type == type_ltc) {
		key = "okcoin_ltc_depth";
		sign = ltc_sign
	}
	
	chrome.storage.local.get(key, function(items) {
		var d = items[key];
		var asks = d['asks']
		var bids = d['bids']
		//console.log(key, d.length);
			
		var buy = $("tbody#depth-buy");
		buy.empty();
		for (var i = 0; i < 10; i++) {
			var tr = $("<tr/>");
			
			var price = $("<td/>").text(cny_sign + bids[i][0]).css("color", "green");
			tr.append(price);
			tr.append($("<td/>").text(sign + bids[i][1]));
			buy.append(tr);
		}
			
		var sell = $("tbody#depth-sell");
		sell.empty();
		for (var i = asks.length - 1; i >= asks.length - 10; i--) {
			var tr = $("<tr/>");
			
			var price = $("<td/>").text(cny_sign + asks[i][0]).css("color", "red");
			tr.append(price);
			tr.append($("<td/>").text(sign + asks[i][1]));
			sell.append(tr);
		}
	});
}

function showTrades(type) {
	var sign = btc_sign;
	var key = "okcoin_btc_trades";
	if (type == type_ltc) {
		key = "okcoin_ltc_trades";
		sign = ltc_sign;
	}
	
	chrome.storage.local.get(key, function(items) {
		var trades = items[key];
		console.log(key, trades.length);
			
		var t = $("tbody#trades");
		t.empty();
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
	});
}

function refresh() {
	
}

$(document).ready(function(){
	var btcTicker = $("tr#btc-ticker");
	var ltcTicker = $("tr#ltc-ticker");
	
	btcTicker.mouseover(function(){
		showDepth(type_btc);
		showTrades(type_btc);
	});
	btcTicker.click(function(){
		getTicker(type_btc);
		getDepth(type_btc);
		getTrades(type_btc);
	});
	
	ltcTicker.mouseover(function(){
		showDepth(type_ltc);
		showTrades(type_ltc);
	});
	ltcTicker.click(function(){
		getTicker(type_ltc);
		getDepth(type_ltc);
		getTrades(type_ltc);
	});
	
	loadTicker(type_btc);
	loadTicker(type_ltc);
	showDepth(type_btc);
	showTrades(type_btc);
});

