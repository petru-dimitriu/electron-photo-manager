function prepareUI()
{
	$("#photoDesc").click( function()
		{
			$(this).hide();
			$("#photoDescEdit").show();
			$("#photoDescEdit").focus();
		}
	);

	$("#photoDescEdit").focusout( function()
	{
		$(this).hide();
		$("#photoDesc").show();
		if ($("#photoDescEdit").val() != "")
		{
			$("#photoDesc").html($("#photoDescEdit").val());
			updatePhotoDescription();
		}
	});

	$("#photoDescEdit").keypress(function(e)
	{
		if (e.which == 13)
			$(this).focusout();
	}
	);

	$("#closeModal").click(hideModal);
}

function displayModal()
{
	$("#myModal").css('display','block');
}

function hideModal()
{
	$("#myModal").css('display','none');
}

function notify(text)
{
	$("#bottombar").html(text);
}

function setTitle(text)
{
	$("#title").html(text);
}


function displayCurrentPhotoWindow()
{
	var numPhotos = -1;
	contents = "";
	for (var i = currentPhotoWindowFirstIndex; i < currentPhotoWindowFirstIndex + photosPerPage  && i < currentPhotoList.length; i++) {
		if (currentPhotoList[i] == null)
			continue;
		numPhotos++;
		if ((numPhotos % 5) === 0) {
			contents += "<tr class='imgrow'>";
		}

		var shortTitle = currentPhotoList[i]['path'].substr(currentPhotoList[i]['path'].lastIndexOf("/")+1);

		contents +=
		  "<td style='background-image: url("  + currentPhotoList[i]['path'] + ")' onclick='javascript:displayPhoto(" + i + ")'>" +
			"<a href='javascript:displayPhoto(" + i + ")'>" +
			"<div id='photoDesc" + numPhotos + "' class = \"photoDesc\"> " + shortTitle + " </div>" +
			"</a>" +
			"</td>";

		if (((numPhotos+1) % 5) === 0) {
			contents += "</tr>";
		}
	}
	if ((numPhotos+1)%5 != 0)
		contents += "</tr>";
	contents += "</table>";
	$("#conts").html(contents);
}


function displayPhotos(albumId, albumTitle)
{
	currentMode = "album";
	$('#title').html(albumTitle);
	$('#albumViewerCommands').css('display','block');
	var query = "SELECT * FROM photos WHERE album = " + albumId;
	contents = "<table>";
	db.all(query, function(err, data) {
		currentPhotoList = data;
		currentPhotoIndex = 0;
		currentPhotoWindowFirstIndex = 0;
		displayCurrentPhotoWindow();
	});
}

function displayPhoto(index)
{
	turnOffMode(currentMode);
	turnOnMode("photo");
	photoIndex = index;
	updatePhotoDisplay();
}

function turnOffMode(mode)
{
	if (mode == 'album')
	{
		$("#mainViewer").hide();
		$("#commands").hide();
	}
	else if (mode == 'photo')
	{
		$("#photoViewer").hide();
		$("#photoViewer").css('opacity',0);
		$("#photoViewer").css('z-index',-1);
		$("#photoCanvas").css('opacity',0);
		$(window).off("keydown");
	}
	else if (mode == 'people')
	{
		$("#conts").html('');
	}
}

function turnOnMode(mode)
{
	currentMode = mode;
	if (mode == 'album')
	{
		$("#mainViewer").show();
		$("#commands").show();
	}
	else if (mode == 'photo')
	{
		$("#photoViewer").show();
		$("#photoViewer").css('opacity',1);
		$("#photoViewer").css('z-index',30);
		$("#photoCanvas").css('opacity',1);
		$(window).keydown(function (e)
			{
				if ((e.keyCode || e.which) == 37) // left
					previousPhoto();
				else if ((e.keyCode || e.which) == 39) // right
					nextPhoto();
			});
	}
	else if (mode == 'people')
	{
		$("#conts").show();
		setTitle("People");
	}
}

function changeMode(newMode)
{
	turnOffMode(currentMode);
	turnOnMode(newMode);
}

function updatePhotoDisplay()
{
	$("#photoCanvas").css('background','black url(\'' + currentPhotoList[photoIndex]['path'] + '\') no-repeat fixed center');
	$("#photoCanvas").css('background-size','contain	');
	var shortTitle = currentPhotoList[photoIndex]['path'].substr(currentPhotoList[photoIndex]['path'].lastIndexOf("/")+1);
	$("#photoTitle").html(shortTitle);
	var description = currentPhotoList[photoIndex]['description'];
	var rating = currentPhotoList[photoIndex]['rating'];

	if (description === null)
	{
		description = "<i>No description for this photo</i>";
		$("#photoDescEdit").val("");
	}
	else
	{
		$("#photoDescEdit").val(description);
	}
	$("#photoDesc").html(description);

	for (var i = 1; i <= 5; i ++)
	{
		if (i == rating)
			$("#rate"+i).css('backgroundColor','yellow');
		else
			$("#rate"+i).css('backgroundColor','black');
	}
}

function hidePhoto()
{
	turnOffMode(currentMode);
	turnOnMode("album");

}

function nextPhoto()
{
	if (photoIndex < currentPhotoList.length - 1)
		photoIndex ++;
	if (photoIndex > currentPhotoWindowFirstIndex + photosPerPage) {
		currentPhotoWindowFirstIndex += photosPerPage + 1;
		displayCurrentPhotoWindow();
	}
	updatePhotoDisplay();
}

function previousPhoto()
{
	if (photoIndex > 0 )
		photoIndex --;
	if (photoIndex >= 0) {
			currentPhotoWindowFirstIndex -= photosPerPage + 1;
			if (currentPhotoWindowFirstIndex < 0)
				currentPhotoWindowFirstIndex = 0;
			displayCurrentPhotoWindow();
		}
	updatePhotoDisplay();
}

function nextPhotos()
{
	if (currentPhotoWindowFirstIndex < currentPhotoList.length - photosPerPage - 1)
		currentPhotoWindowFirstIndex += photosPerPage;
	displayCurrentPhotoWindow();
}

function prevPhotos()
{
		currentPhotoWindowFirstIndex -= photosPerPage;
		if (currentPhotoWindowFirstIndex < 0)
			currentPhotoWindowFirstIndex = 0;
	displayCurrentPhotoWindow();
}

function displayPeople()
{
	changeMode("people");
	loadPeopleIntoContents();
}

function loadPeopleIntoContents()
{
	getPeopleList(writePeopleList);
}

function writePeopleList(rows)
{
	var conts = "<table> \
	<tr id='insertRow'><td colspan='2'>\
	<input id='incrementalSearchVal' style='width:100%;' placeholder = 'Type here to search or insert new person.'>\
	</tr>";

	for (var i = 0; i < rows.length; i ++)
	{
		conts += "<tr><td>" + rows[i]['name'] + "</td> \
		<td style='min-width:350px'> <a href='javascript:displayPhotosWithPersonClick(" + rows[i]['id'] +")'>View</a> \
		<a href='javascript:removePersonClick(" + rows[i]['id'] + ")'>Remove</a> </td>\
		</tr>";
	}
	conts += "</table>";
	$("#conts").html(conts);
	$("#incrementalSearchVal").keydown(tableInputKeydown);
}

function tableInputKeydown(event)
{
	if (event.which == 13)
	{
		var newPersonName = $('#incrementalSearchVal').val();
		insertPerson(newPersonName,
			function()
		{
			loadPeopleIntoContents();
			notify('Person ' + newPersonName + ' added');
		});
	}
	else
		incrementalSearch();
}

function incrementalSearch()
{
	var searchval = $("#incrementalSearchVal").val();
	var tableRows = $("table tr");
	for (var i=1;i<=tableRows.length;i++)
	{
		if ($(tableRows[i]).text().search(searchval) == -1)
			$(tableRows[i]).css("display","none");
		else
			$(tableRows[i]).css("display","table-row");
	}

}

function removePersonClick(id)
{
	removePerson(id,
		function(err){
			if (err == null)
			{
				notify("Person removed.");
				loadPeopleIntoContents();
			}
			else
			{
				notify("Person not removed.");
			}
		});
}

function displayPhotoWithPersonClick(id)
{

}

function getPeopleList(callback)
{
	var query = "SELECT * FROM people";
	db.serialize(function(){
		db.all(query, function(err, rows){
				console.log(rows);
			callback(rows);
		});
	});
}
