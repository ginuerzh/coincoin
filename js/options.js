var coin_type_key = "show_coin_type";
var interval_key = "update_interval";
var price_low_key = "notify_low_price";
var price_high_key = "notify_high_price";

function loadOptions() {
	var keys = {};
	keys[coin_type_key] = "btc";
	keys[interval_key] = 1;
	keys[price_low_key] = 0;
	keys[price_high_key] = 0;
	
	chrome.storage.local.get(keys, function(items){
		console.log("load options", items);
		
		if (items[coin_type_key] == "btc") $("#coin-type-btc").attr("checked", "checked");
		else $("#coin-type-ltc").attr("checked", "checked");
		
		$("#interval").val(items[interval_key]);
		$("#low-price").val(items[price_low_key]);
		$("#high-price").val(items[price_high_key]);
	});
}

function saveCoinType() {
	var type = $(this).attr("value");
	//console.log(type);
	var coinType = {};
	coinType[coin_type_key] = type;
	chrome.storage.local.set(coinType);
}

function saveInterval() {
	var interval = parseFloat($(this).val());
	
	if (isNaN(interval) || interval < 1) interval = 1;
	console.log("interval", $(this).val(), interval);
	
	var intvl = {};
	intvl[interval_key] = interval;
	chrome.storage.local.set(intvl);
}

function saveLowPrice() {
	var price = parseFloat($(this).val());
	
	if (isNaN(price) || price < 0) price = 0;
	console.log("low price", $(this).val(), price);
	
	var p = {};
	p[price_low_key] = price;
	chrome.storage.local.set(p);
}

function saveHighPrice() {
	var price = parseFloat($(this).val());
	
	if (isNaN(price) || price < 0) price = 0;
	console.log("high price", $(this).val(), price);
	
	var p = {};
	p[price_high_key] = price;
	chrome.storage.local.set(p);
}

$(function(){
	loadOptions();
	$(".coin-type").click(saveCoinType);
	$("#interval").keyup(saveInterval);
	$("#low-price").keyup(saveLowPrice);
	$("#high-price").keyup(saveHighPrice);

});
