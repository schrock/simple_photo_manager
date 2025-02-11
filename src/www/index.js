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
var albums = {};
var trashList = [];
var yearMonthList = [];

document.onreadystatechange = function () {
	if (document.readyState == "complete") {
		initApplication();
	}
}

async function initApplication() {
	let dataObject = await fetch("data");
	let data = await dataObject.json();
	console.log(data);
	photoList = data.photos;
	albums = data.albums;
	trashList = data.trash;
	document.getElementById("photoCount").innerText = photoList.length;
	document.getElementById("albumCount").innerText = Object.keys(albums).length;
	document.getElementById("trashCount").innerText = trashList.length;
	showPhotos();
	loadVisibleThumbnails();
}

function showPhotos() {
	document.getElementById("sidebar").innerHTML = "";
	document.getElementById("main").innerHTML = "";
	yearMonthList = [];
	for (id of photoList) {
		var yearMonth = id.substr(0, 6);
		var year = id.substr(0, 4);
		var month = id.substr(4, 2);
		if (!yearMonthList.includes(yearMonth)) {
			yearMonthList.push(yearMonth);
			document.getElementById("sidebar").innerHTML += '<h3><a href="#section_' + yearMonth + '">' + year + ' ' + monthStringMap.get(month) + '</a></h3>';
			document.getElementById("main").innerHTML += '<h2 id="section_' + yearMonth + '">' + year + ' ' + monthStringMap.get(month) + '</h2>';
			document.getElementById("main").innerHTML += '<div id="' + yearMonth + '" class="photosBox"></div>';
		}
	}
}

function showAlbums() {
	document.getElementById("sidebar").innerHTML = "";
	document.getElementById("main").textContent = "";
	for (albumName of Object.keys(albums)) {
		document.getElementById("sidebar").innerHTML += '<h3><a href="#section_' + albumName + '">' + albumName + '</a></h3>';
		document.getElementById("main").innerHTML += '<h2 id="section_' + albumName + '">' + albumName + '</h2>';
		document.getElementById("main").innerHTML += '<div id="' + albumName + '" class="photosBox"></div>';
	}
}

function showTrash() {
	document.getElementById("sidebar").innerHTML = "<h3>Trash</h3>";
	document.getElementById("main").textContent = "";
	document.getElementById("main").innerHTML += '<h2>Trash</h2>';
	document.getElementById("main").innerHTML += '<div id="Trash" class="photosBox"></div>';
	var photosDiv = document.getElementById("Trash");
	htmlStringArray = [];
	for (id of trashList) {
		htmlStringArray.push('<div class="photo"><a href="trash?id=' + id + '" target="_blank"><img src="thumbnail?id=' + id + '"></a></div>');
	}
	photosDiv.innerHTML = htmlStringArray.join("");
}

function loadVisibleThumbnails() {
	for (yearMonth of yearMonthList) {
		var photosDiv = document.getElementById(yearMonth);
		if (photosDiv !== null && photosDiv.childNodes.length == 0 && isInViewport(photosDiv)) {
			htmlStringArray = [];
			for (id of photoList) {
				if (yearMonth == id.substr(0, 6)) {
					htmlStringArray.push('<div class="photo"><a href="photo?id=' + id + '" target="_blank"><img src="thumbnail?id=' + id + '"></a></div>');
				}
			}
			photosDiv.innerHTML = htmlStringArray.join("");
			break;
		}
	}
	setTimeout(loadVisibleThumbnails, 500);
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
