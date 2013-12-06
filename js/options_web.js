
var options = chrome.extension.getBackgroundPage().getOptions();


function saveMarkets() {
	var value = $(this).attr("value")
	console.log("market select", value, this.checked);
	options.markets[value] = this.checked;

	save(options_key, options);
}

function setDefault() {
	options.market = $(this).attr("value");
	console.log("set default market", options.market);

	save(options_key, options);
}

function saveCoinType() {
	var type = $(this).attr("value");
	console.log("new coin type", type);
	options.coin_type = type;
	save(options_key, options);
}

function saveInterval() {
	var interval = parseFloat($(this).val());

	if (isNaN(interval) || interval < 1) interval = 1;
	console.log("interval", $(this).val(), interval);

	options.interval = interval;
	save(options_key, options);
}

function saveLowPrice() {
	var price = parseFloat($(this).val());

	if (isNaN(price) || price < 0) price = 0;
	console.log("low price", $(this).val(), price);

	options.low_price = price;
	save(options_key, options);
}

function saveHighPrice() {
	var price = parseFloat($(this).val());

	if (isNaN(price) || price < 0) price = 0;
	console.log("high price", $(this).val(), price);

	options.high_price = price;
	save(options_key, options);
}

function saveTableLength() {
	var length = parseInt($(this).val());

	if (isNaN(length) || length < 0 || length > 30) {
		length = 8;
	}
	console.log("table length", $(this).val(), length);
	options.table_length = length;
	save(options_key, options);
}

function notifyTest() {
	var nid = "1";
	var opt = {
		type: "basic",
		title: "Primary Title",
		message: "Primary message to display",
		iconUrl: "images/btc.png"
	};
	chrome.notifications.create(nid, opt, function(notificationId){
		console.log("notification id", notificationId);
	});
}

function restoreOptions() {
	var markets = $(".markets");
	console.log('markets', markets.length)
	for (var i = 0; i < markets.length; i++) {
		markets[i].checked = options.markets[$(markets[i]).attr("value")];
	}

	var defaults = $(".default");
	for (var i = 0; i < defaults.length; i++) {
		if ($(defaults[i]).attr("value") == options.market) {
			defaults[i].checked = true;
			break;
		}
	}


	if (options.coin_type == coin_btc) {
		$("#coin-type-btc").attr("checked", "checked");
	} else {
		$("#coin-type-ltc").attr("checked", "checked");
	}
	$("#interval").val(options.interval);
	$("#low-price").val(options.low_price);
	$("#high-price").val(options.high_price);
	$("#table-length").val(options.table_length);
}

$(function(){
	restoreOptions();

	$(".markets").click(saveMarkets);
	$(".default").click(setDefault);

	$(".coin-type").click(saveCoinType);
	$("#interval").keyup(saveInterval);
	$("#low-price").keyup(saveLowPrice);
	$("#high-price").keyup(saveHighPrice);
	$("#table-length").keyup(saveTableLength);

	$("#btn-notify-test").click(notifyTest);

});
