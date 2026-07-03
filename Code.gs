/***
 * Google Apps Script Backend for Video & Photo Storage App
 * 
 * Target Google Drive Folder:
 * https://drive.google.com/drive/folders/1HA4N-L7pofxBhIguE8IBeg8q0xkjZb8M
 * Folder ID: 1HA4N-L7pofxBhIguE8IBeg8q0xkjZb8M
 * 
 * Instructions:
 * 1. Go to https://script.google.com/
 * 2. Create a new project named "Video & Photo Backend"
 * 3. Replace the contents of Code.gs with this code
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type "Web app"
 * 6. Set Description: "Video & Photo API v1"
 * 7. Set "Execute as" to "Me" (your Google account)
 * 8. Set "Who has access" to "Anyone" (crucial for API access from GitHub Pages)
 * 9. Click "Deploy" and authorize the script permissions
 * 10. Copy the Web App Exec URL (ends with /exec) and paste it in the config file of your frontend
 */

var FOLDER_ID = "1HA4N-L7pofxBhIguE8IBeg8q0xkjZb8M";

/**
 * Handle HTTP GET Requests (e.g. listing files)
 */
function doGet(e) {
  var action = e.parameter.action;
  var pageToken = e.parameter.pageToken || null;
  
  if (action === "list") {
    return listFiles(pageToken);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: false, 
    error: "Invalid action. Use ?action=list to retrieve files." 
  }))
  .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle HTTP POST Requests (e.g. uploading a file)
 */
function doPost(e) {
  try {
    var params;
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else {
      params = e.parameter;
    }
    
    if (!params || !params.base64 || !params.name || !params.mimeType) {
      throw new Error("Missing required parameters: base64, name, or mimeType");
    }
    
    var folder = DriveApp.getFolderById(FOLDER_ID);
    
    // Decode base64 data
    var decoded = Utilities.base64Decode(params.base64);
    var blob = Utilities.newBlob(decoded, params.mimeType, params.name);
    
    // Create the file in the public folder
    var file = folder.createFile(blob);
    
    // Set file sharing permissions so anyone with the link can view it (required for display)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var response = {
      success: true,
      id: file.getId(),
      name: file.getName(),
      mimeType: file.getMimeType(),
      created: file.getDateCreated().getTime(),
      webViewLink: file.getUrl(),
      thumbnailLink: getThumbnailLinkSafe(file.getId())
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: err.toString() 
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Retrieve all files in the folder and sort by date created descending using Advanced Drive Service
 */
function listFiles(pageToken) {
  try {
    if (typeof Drive === 'undefined') {
      throw new Error("L'API 'Advanced Drive Service' n'est pas activée. Allez dans Services > Ajouter Drive API.");
    }
    
    var query = "'" + FOLDER_ID + "' in parents and trashed = false";
    var optionalArgs = {
      q: query,
      orderBy: "createdDate desc",
      maxResults: 20
    };
    
    if (pageToken) {
      optionalArgs.pageToken = pageToken;
    }
    
    var response = Drive.Files.list(optionalArgs);
    var items = response.items || [];
    var result = [];
    
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      result.push({
        id: item.id,
        name: item.title,
        mimeType: item.mimeType,
        created: new Date(item.createdDate).getTime(),
        size: item.fileSize,
        webViewLink: item.alternateLink,
        thumbnailLink: item.thumbnailLink || null
      });
    }
    
    var output = JSON.stringify({ 
      success: true, 
      files: result,
      nextPageToken: response.nextPageToken || null
    });
    
    return ContentService.createTextOutput(output)
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: err.toString() 
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Safely retrieve the thumbnail link using the Advanced Drive Service if enabled.
 * Returns null if the service is not enabled.
 */
function getThumbnailLinkSafe(fileId) {
  try {
    if (typeof Drive !== 'undefined') {
      return Drive.Files.get(fileId).thumbnailLink;
    }
  } catch (e) {
    // Advanced Drive Service is not enabled or failed
  }
  return null;
}
