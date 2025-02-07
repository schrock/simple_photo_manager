'use strict';

// 3rd party
const cluster = require('cluster');
const os = require('os');
const express = require('express');
const http = require('http');
const fs = require('fs');

var httpPort = 8081;

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
	app.use(process.env.WEBBASEDIR, express.static('src/www'));
	app.use(process.env.WEBBASEDIR + '/node_modules', express.static('node_modules'));
	app.get(process.env.WEBBASEDIR + '/list', getList);
	app.get(process.env.WEBBASEDIR + '/photo', getPhoto);
	app.get(process.env.WEBBASEDIR + '/trash', getTrashPhoto);
	app.get(process.env.WEBBASEDIR + '/thumbnail', getThumbnail);

	var server = http.createServer(app);
	server.listen(httpPort, function () {
		console.log('worker running on port ' + httpPort + '...');
	});
}

function getList(req, res) {
	var photos = fs.readdirSync(process.env.PROCESSED);
	photos.sort();
	photos.reverse();
	var albums = fs.readdirSync(process.env.ALBUMS);
	albums.sort();
	var trash = fs.readdirSync(process.env.TRASH);
	trash.sort();
	var dataList = {};
	dataList.photos = photos;
	dataList.albums = albums;
	dataList.trash = trash;
	res.contentType('application/json');
	res.send(JSON.stringify(dataList, null, 4));
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
