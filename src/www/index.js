const monthStringMap = new Map([
	["01", "January"],
	["02", "February"],
	["03", "March"],
	["04", "April"],
	["05", "May"],
	["06", "June"],
	["07", "July"],
	["08", "August"],
	["09", "September"],
	["10", "October"],
	["11", "November"],
	["12", "December"]
]);

var photoList = [];
var albumList = []
var trashList = [];
var yearMonthList = [];

document.onreadystatechange = function () {
	if (document.readyState == "complete") {
		initApplication();
	}
}

async function initApplication() {
	let dataListObject = await fetch("list");
	let dataList = await dataListObject.json();
	photoList = dataList.photos;
	albumList = dataList.albums;
	trashList = dataList.trash;
	document.getElementById("photoCount").innerText = photoList.length;
	document.getElementById("albumCount").innerText = albumList.length;
	document.getElementById("trashCount").innerText = trashList.length;
	showPhotos();
	loadVisibleThumbnails();
}

function showPhotos() {
	document.getElementById("main").innerHTML = "";
	yearMonthList = [];
	for (id of photoList) {
		var yearMonth = id.substr(0, 6);
		var year = id.substr(0, 4);
		var month = id.substr(4, 2);
		if (!yearMonthList.includes(yearMonth)) {
			yearMonthList.push(yearMonth);
			document.getElementById("main").innerHTML += '<h1>' + year + ' ' + monthStringMap.get(month) + '</h1>';
			document.getElementById("main").innerHTML += '<div id="' + yearMonth + '" class="photosBox"></div>';
		}
		//document.getElementById(yearMonth).innerHTML += '<div class="placeholder"></div>';
	}
}

function showAlbums() {
	document.getElementById("main").textContent = "";
	for (id of albumList) {
		document.getElementById("main").innerHTML += '<h1><a href="javascript:toggleAlbumThumbnails(\'' + id + '\');">' + id + '</a></h1>';
		document.getElementById("main").innerHTML += '<div id="' + id + '" class="photosBox"></div>';
	}
}

function showTrash() {
	document.getElementById("main").textContent = "";
	document.getElementById("main").innerHTML += '<h1>Trash</h1>';
	document.getElementById("main").innerHTML += '<div id="Trash" class="photosBox"></div>';
	var photosDiv = document.getElementById("Trash");
	for (id of trashList) {
		photosDiv.innerHTML += '<div class="photo"><a href="trash?id=' + id + '" target="_blank"><img src="thumbnail?id=' + id + '"></a></div>';
	}
}

function loadVisibleThumbnails() {
	for (yearMonth of yearMonthList) {
		var photosDiv = document.getElementById(yearMonth);
		if (photosDiv !== null && photosDiv.childNodes.length == 0 && isInViewport(photosDiv)) {
			for (id of photoList) {
				if (yearMonth == id.substr(0, 6)) {
					photosDiv.innerHTML += '<div class="photo"><a href="photo?id=' + id + '" target="_blank"><img src="thumbnail?id=' + id + '"></a></div>';
				}
			}
			break;
		}
	}
	setTimeout(loadVisibleThumbnails, 500);
}

function toggleAlbumThumbnails(id) {
	var photosDiv = document.getElementById(yearMonth);
	if (photosDiv !== null) {
		if (photosDiv.childNodes.length == 0) {
			
		} else {
			photosDiv.innerHTML = "";
		}
	}
}

function isInViewport(element) {
	const rect = element.getBoundingClientRect();
	return (
		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
		rect.right <= (window.innerWidth || document.documentElement.clientWidth)
	);
}
