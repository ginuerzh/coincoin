var coin_btc = "btc";
var coin_ltc = "ltc"

var market_okcoin = 'okcoin';
var market_btcchina = 'btcchina';
var market_mtgox = 'mtgox';
var market_btce = 'btce';

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


function getFloat(v) {
	var f = parseFloat(v);
	if (isNaN(f))
		return 0;
	else
		return f;
}

function save(key, value) {
	var o = {};

	o[key] = value;
	chrome.storage.local.set(o, function(){
		console.log(key, "saved!");
	});
}
