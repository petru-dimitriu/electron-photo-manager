fs = require('fs');
sqlite = require('sqlite3');
remote = require('remote');
dialog = remote.require('dialog');
require('jquery-ui');
window.$ = window.jQuery = require('jquery');
photosPerPage = 20;
$(window).mousemove(mouseMoveHandler);
currentMode = "";

function initDB()
{
	db.serialize();
	db.run(`PRAGMA foreign_keys = ON`);
	db.run(`DROP TABLE IF EXISTS photos`);
	db.run(`DROP TABLE IF EXISTS photosExtraData`);
	db.run(`DROP TABLE IF EXISTS albums`);
	db.run(`DROP TABLE IF EXISTS locations`);
	db.run(`DROP TABLE IF EXISTS people`);
	db.run(`DROP TABLE IF EXISTS peopleInPhotos`);
	db.run(`DROP TABLE IF EXISTS locations`);

	lastQuerySuccessful = true;

	db.run(`CREATE TABLE locations (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT,
		latitude REAL,
		longitude REAL CHECK (latitude < 90 and latitude > -90 and longitude < 180 and longitude > -180)
	)`);

	db.run(`CREATE TABLE albums (
		id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		desc TEXT NULL,
		CONSTRAINT uq_title UNIQUE(title))`,  {}, function(err){ lastQuerySuccessful = false;});

	db.run(`CREATE TABLE photos(
	 id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	 path TEXT NOT NULL,
	 description TEXT NULL,
	 album_id INTEGER NULL REFERENCES albums(id) ON DELETE CASCADE,
	 rating INTEGER NULL,
	 location_id INTEGER NULL REFERENCES locations(id) ON DELETE CASCADE
 	)`, {}, function(err){ lastQuerySuccessful = false;});

	 db.run(`CREATE TABLE photosExtraData(
		 photo_id INTEGER PRIMARY KEY AUTOINCREMENT,
		 data TEXT,
		 FOREIGN KEY(photo_id) REFERENCES photos(id) ON DELETE CASCADE
	 )`);


	 if (lastQuerySuccessful == false)
	 {
		 notify("Tables NOT created successfully!");
		 return;
	 }

	if (lastQuerySuccessful == false)
	{
		 notify("Tables NOT created successfully!");
	 	 return;
	}

	db.run(`CREATE TABLE people (
		id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		name TEXT NULL)`
		);

	db.run('INSERT INTO people (name) VALUES (\'Petru\'), (\'Robert\')' );

	db.run(`CREATE TABLE peopleInPhotos (
		person_id INTEGER,
		photo_id INTEGER,
		FOREIGN KEY(person_id) REFERENCES people(id),
		FOREIGN KEY(photo_id) REFERENCES photos(id),
		CONSTRAINT uq_couple UNIQUE(person_id, photo_id))`
		);

	db.run('INSERT INTO locations (name, latitude, longitude) VALUES (\'Iasi\', 47.151726, 27.587914), (\'Bucharest\', 44.439663, 26.096306)' );

	notify("Tables created successfully!");
}

function parseRootDirectoryDialog()
{
	dialog.showOpenDialog(
		null,
		{
			title: "Choose root dir",
			properties: ["openDirectory"]
		},
		function(rootDir)
		{
			parseRootDirectory(rootDir[0]);
			root = rootDir[0];
		}
	)
}

function parsePhotosInAlbum(rootDir,albumId)
{
	var filenames = fs.readdirSync(rootDir);
	var photoStatement = "INSERT INTO photos (path, album_id) VALUES ";
	var photoExtraStatement = "INSERT INTO photosExtraData (data) VALUES ";
	var photoDetailsArray = [];
	var photoSizeArray = [];
	var currentFileName;

	for (var i = 0; i<filenames.length;i++)
	{
		stats = fs.statSync(rootDir+"/"+filenames[i]);
		if (stats.isFile())
		{
			currentFileName = rootDir+"/"+filenames[i];
			currentFileName = currentFileName.replace(/\\/g, "/");
			console.log(currentFileName);
			photoDetailsArray.push(currentFileName);
			
			photoDetailsArray.push(albumId);
			photoSizeArray.push(stats.size);
		}
	}

	if (photoDetailsArray.length > 0)
	{
		photoStatement += "(?, ?), ".repeat(photoDetailsArray.length/2 -1) + "(?, ?)";
		photoExtraStatement += "(?), ".repeat(photoExtraStatement.length-1) + "(?)";
		db.serialize(function()
		{
					db.run(photoStatement,photoDetailsArray);
					db.run(photoExtraStatement,photoSizeArray);
		},function(){
			notify("Finished creating album " + albumName);
		});
}

}

function parseRootDirectory(rootDir, addFiles, albumName)
{
	notify("Parsing " + rootDir + "...");
	// get array of filenames
	var filenames = fs.readdirSync(rootDir);
	var directories = [];
	var albumId = -1;
	var stats;

	if (albumName !== undefined)
	{
		db.serialize(function() {
			var that = this;
			db.get("SELECT id FROM albums where title = ?", albumName, function(err, row)
			{
				albumId = row["id"];
				parsePhotosInAlbum(rootDir, albumId);
			});
		}
	)};

	for (var i = 0; i<filenames.length;i++)
	{
		stats = fs.statSync(rootDir+"/"+filenames[i]);
		if (stats.isDirectory())
		{
			directories.push(filenames[i]);
		}
	}

	if (directories.length > 0)
	{
		var statement = "INSERT INTO albums (title) VALUES" + "(?),".repeat(directories.length-1) + "(?)";

		db.run(statement,directories);
		for (var i = 0; i<directories.length; i++)
		{
			parseRootDirectory(rootDir + "/" + directories[i] + "/",true,directories[i]);
		}
	}
}

window.onload = function init()
{
	db = new sqlite.Database('photos.db');
	if (db)
	{
		notify("Database opened successfully.");
		db.serialize();
	}
};

function delPhoto()
{
	var currentPhotoId = currentPhotoList[photoIndex]['id'];
	db.run("DELETE FROM photos WHERE id = ? ", [currentPhotoId], function(error)
	{
		if (error === null)
		{
			currentPhotoList.splice(photoIndex,1);
			$("#photoViewer").animate({opacity:0},500, function(){
				turnOffMode('photo');
				turnOnMode('album');
				displayCurrentPhotoWindow();
			});

		}
	});
}

function setCurrentPhotoRating(rating)
{
	var currentPhotoId = currentPhotoList[photoIndex]['id'];
	var oldRating = currentPhotoList[photoIndex]['rating'];
	db.run("UPDATE photos SET rating = ? WHERE id = ?",[rating, currentPhotoId],
		function(error)
		{
			if (error === null)
			{
				$("#rate"+rating).css('backgroundColor','green');
				if (oldRating !== null)
				{
					$("#rate"+oldRating).animate({backgroundColor : 'black'});
				}
				$("#rate"+rating).animate({backgroundColor : 'yellow'});
				currentPhotoList[photoIndex]['rating'] = rating;
			}
			else
			{
				$("#rate"+rating).css('backgroundColor','red');
			}
		});
}

function updatePhotoDescription()
{
	var currentPhotoId = currentPhotoList[photoIndex]['id'];
	var newPhotoDescription = $("#photoDesc").html();
	db.run("UPDATE photos SET description = ?  WHERE id = ?", [newPhotoDescription, currentPhotoId],
		function(error) {
			if (error !== null)
			{
				$("#photoDesc").css("backgroundColor","red");
			}
			else
			{
				$("#photoDesc").css("backgroundColor","green");

				currentPhotoList[photoIndex]['description'] = newPhotoDescription;
			}
			$("#photoDesc").animate({backgroundColor:"black"},500);
		})
}

function removePerson(id, callback)
{
	var query = "DELETE FROM people WHERE id = " + id;
	db.exec(query, callback);
}

function insertPerson(name, callback)
{
	var query = "INSERT INTO people (name) VALUES (?) ";
	db.run(query, [ name ], callback);
}

function insertLocation(name, lat, long, callback)
{
	var query = "INSERT INTO locations (name, latitude, longitude) VALUES (?, ?, ?) ";
	db.run(query, [ name, lat, long ], callback);
}

function removeLocation(id, callback)
{
	var query = "DELETE FROM locations WHERE id = " + id;
	db.exec(query, callback);
}

function removeAlbum(id, callback)
{
	var query = "DELETE FROM albums WHERE id = " + id;
	db.exec(query, callback);
}

function insertPersonInPhoto(person_id, photo_id, callback)
{
	var query = "INSERT INTO peopleInPhotos (photo_id, person_id) VALUES (?,?)";
	db.run(query, [ photo_id, person_id ], callback);
}

function getPeopleInPhoto(photoId, callback)
{
	var query = "SELECT id, name FROM people, peopleInPhotos WHERE peopleInPhotos.person_id = people.id AND photo_id = ?";
	db.all(query,[ photoId ],callback);
}

function removePersonFromPhoto(person_id, photo_id, callback)
{
	var query = "DELETE FROM peopleInPhotos WHERE photo_id = ? AND person_id = ?";
	db.serialize(function(){
		db.run(query, [ photo_id, person_id ], callback);
	});
}

function insertPhotoIntoAlbum(path, album, callback)
{
	var query = "INSERT INTO photos (path, album_id) VALUES (?,?)";
	db.run(query, [path, album], callback);
}

function getAlbumName(id, callback)
{
	var query = "SELECT title FROM albums WHERE id = ?";
	db.all(query, [id], callback );
}

function getLocationName(id, callback)
{
	var query = "SELECT name FROM locations WHERE id = ?";
	db.all(query, [id], callback );
}

function displayAlbums()
{
	var query = "SELECT * FROM albums";
	contents = "<table>";
	db.serialize(function(){
		db.each(query,function(err,row){
			contents += "<tr><td><a href='javascript:displayPhotos(" + row['id'] + ", \"" + row['title'] + "\"" + ")'>" + row['title'] + "</a></td> \
			<td><a href='javascript:removeAlbumClick(" + row['id'] + ")'>Remove</a></td></tr>";
		}, function(err){
			contents += "<tr><td><input id='newAlbumName'></td><td><a href='javascript:addAlbumClick()'>Add new</a></td></tr>";
			contents += "</table>";
			$("#conts").html(contents);
		});
	});
}

function addAlbumClick()
{
	addAlbum($("#newAlbumName").val(), displayAlbums);
}

function addAlbum(name, callback)
{
	var query = "INSERT INTO albums (title) VALUES (?)";
	db.run(query,[name], callback);
}

function getAlbums(callback)
{
	var query = "SELECT * FROM albums";
	db.all(query,[],callback);
}

function getLocations(callback)
{
	var query = "SELECT * FROM locations";
	db.all(query,[],callback);
}

function movePhotoToAlbum(photoId, albumId, callback)
{
	var query = "UPDATE photos SET album_id = ? WHERE id = ?";
	albumId = parseInt(albumId);
	db.run(query, [albumId, photoId], callback);
}

function movePhotoToLocation(photoId, locationId, callback)
{
	var query = "UPDATE photos SET location_id = ? WHERE id = ?";
	db.run(query, [locationId, photoId], callback);
}

function removeAlbumClick(id)
{
	removeAlbum(id,
		function(err){
			if (err == null)
			{
				notify("Album removed.");
				displayAlbums();
			}
			else
			{
				notify("Album not removed.");
			}
		});
}
