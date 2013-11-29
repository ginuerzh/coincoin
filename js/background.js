
var btc_ticker, ltc_ticker;

function btc_ticker_handler() {
	
	if (this.readyState == this.DONE) {
		btc_ticker = JSON.parse(this.responseText);
		alert(this.responseText)
	}
}

function ltc_ticker_handler() {
	if (this.readyState == this.DONE) {
		ltc_ticker = JSON.parse(this.responseText);
		alert(this.responseText)
	}
}

function request(method, url, handler) {
	var xhr = new XMLHttpRequest()
	
	xhr.onreadystatechange = handler
	xhr.open(method, url, true)
	xhr.send();
}

function get_btc_ticker() {
	request("GET", "http://www.okcoin.com/api/ticker.do", btc_ticker_handler)
}

function get_ltc_ticker() {
	request("GET", "http://www.okcoin.com/api/ticker.do?symbol=ltc_cny", ltc_ticker_handler)
}

//get_btc_ticker()
//get_ltc_ticker()
var url = chrome.runtime.getURL("popup.html")
alert(url)
