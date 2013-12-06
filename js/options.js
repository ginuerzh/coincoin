var options_key = "options";

function Options() {
	this.markets = {
		okcoin: true,
		btcchina: false,
		mtgox: false,
		btce: false
	};

	this.market = market_okcoin;
	this.coin_type = coin_btc;
	this.interval = 1;
	this.low_price = 0;
	this.high_price = 0;
	this.table_length = 8;
}


