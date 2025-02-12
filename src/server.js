'use strict';

// 3rd party
const cluster = require('cluster');
const os = require('os');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

const safePaths = [
	process.env.WEBBASEDIR + '/login.html',
	process.env.WEBBASEDIR + '/login',
	process.env.WEBBASEDIR + '/logout'
];

if (cluster.isMaster) {
	var numCPUs = os.cpus().length;
	for (var i = 0; i < numCPUs; i++) {
		// Create a worker
		cluster.fork();
	}

	cluster.on('exit', function (worker, code, signal) {
		console.log('Worker %d died with code/signal %s. Restarting worker...', worker.process.pid, signal || code);
		cluster.fork();
	});
} else {
	var app = express();
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(cookieParser());
	app.use(checkSessionId);
	app.use(process.env.WEBBASEDIR, express.static('src/www'));
	app.use(process.env.WEBBASEDIR + '/node_modules', express.static('node_modules'));
	app.post(process.env.WEBBASEDIR + '/login', postLogin);
	app.get(process.env.WEBBASEDIR + '/logout', getLogout);
	app.get(process.env.WEBBASEDIR + '/data', getData);
	app.get(process.env.WEBBASEDIR + '/photo', getPhoto);
	app.get(process.env.WEBBASEDIR + '/trash', getTrashPhoto);
	app.get(process.env.WEBBASEDIR + '/thumbnail', getThumbnail);

	var server = http.createServer(app);
	var httpPort = process.env.PORT;
	server.listen(httpPort, function () {
		console.log('worker running on port ' + httpPort + '...');
	});
}

function checkSessionId(req, res, next) {
	if (safePaths.includes(req.path)) {
		next();
	} else {
		// check session id
		var sessionId = req.cookies.sessionId;
		if (fs.existsSync('session_cache/' + sessionId)) {
			next();
		} else {
			res.status(303);
			res.setHeader('Location', 'login.html');
			res.send('Valid login credentials required for access. Redirecting to login page...');
		}
	}
}

function postLogin(req, res) {
	var username = req.body.username;
	var hash = crypto.createHash('sha512').update(req.body.password).digest('hex');
	var userEntries = fs.readFileSync('conf/users', {encoding: 'utf8', flag: 'r'}).split("\n");
	var usernameFound = false;
	var hashMatches = false;
	for (var userEntry of userEntries) {
		if (userEntry.indexOf(":") == -1) {
			continue;
		}
		var userEntryParts = userEntry.split(":", 2);
		if (userEntryParts[0] != username) {
			continue;
		}
		usernameFound = true;
		if (userEntryParts[1] == hash) {
			hashMatches = true;
		}
		break;
	}
	if (!usernameFound || !hashMatches) {
		res.status(303);
		res.setHeader('Location', 'login.html');
		res.contentType('text/plain');
		res.send('Invalid credentials.');
	} else {
		var sessionId = crypto.randomBytes(16).toString('hex');
		fs.writeFileSync('session_cache/' + sessionId, username, {encoding: 'utf8', flush: true});
		res.setHeader('Set-Cookie', 'sessionId=' + sessionId + '; Path=' + process.env.WEBBASEDIR);
		res.status(303);
		res.setHeader('Location', 'index.html');
		res.contentType('text/plain');
		res.send('Login successful. Redirecting...');
	}
}

function getLogout(req, res) {
	var sessionId = req.cookies.sessionId;
	fs.unlinkSync('session_cache/' + sessionId);
	res.setHeader('Set-Cookie', 'sessionId=' + sessionId + '; Path=' + process.env.WEBBASEDIR + '; expires=Thu, 01 Jan 1970 00:00:00 GMT');
	res.status(303);
	res.setHeader('Location', 'login.html');
	res.send('Logged out. Redirecting to login page...');
}

function getData(req, res) {
	var data = {};

	var photos = fs.readdirSync(process.env.PROCESSED);
	photos.sort();
	photos.reverse();
	data.photos = photos;

	var albums = new Map();
	var albumNames = fs.readdirSync(process.env.ALBUMS);
	albumNames.sort();
	for (var albumName of albumNames) {
		var photos = fs.readdirSync(process.env.ALBUMS + '/' + albumName);
		photos.sort();
		photos.reverse();
		albums.set(albumName, photos);
	}
	data.albums = Object.fromEntries(albums);

	var trash = fs.readdirSync(process.env.TRASH);
	trash.sort();
	trash.reverse();
	data.trash = trash;

	res.contentType('application/json');
	res.send(JSON.stringify(data, null, 4));
}

function getPhoto(req, res) {
	var filepath = process.env.PROCESSED + '/' + req.query.id;
	if (fs.existsSync(filepath)) {
		res.sendFile(filepath);
	} else {
		res.status(404);
		res.contentType('text/plain');
		res.send('File not found.');
	}
}

function getTrashPhoto(req, res) {
	var filepath = process.env.TRASH + '/' + req.query.id;
	if (fs.existsSync(filepath)) {
		res.sendFile(filepath);
	} else {
		res.status(404);
		res.contentType('text/plain');
		res.send('File not found.');
	}
}

function getThumbnail(req, res) {
	var filepath = process.env.THUMBNAILS + '/' + req.query.id + '.jpg';
	if (fs.existsSync(filepath)) {
		res.sendFile(filepath);
	} else {
		res.status(404);
		res.contentType('text/plain');
		res.send('File not found.');
	}
}
