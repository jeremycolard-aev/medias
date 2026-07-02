/**
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
  
  if (action === "list") {
    return listFiles();
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
      webViewLink: file.getWebViewLink(),
      thumbnailLink: file.getThumbnailLink()
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
 * Retrieve all files in the folder and sort by date created descending
 */
function listFiles() {
  try {
    var folder = DriveApp.getFolderById(FOLDER_ID);
    var files = folder.getFiles();
    var result = [];
    
    while (files.hasNext()) {
      var file = files.next();
      var mimeType = file.getMimeType();
      
      result.push({
        id: file.getId(),
        name: file.getName(),
        mimeType: mimeType,
        created: file.getDateCreated().getTime(),
        size: file.getSize(),
        webViewLink: file.getWebViewLink(),
        thumbnailLink: file.getThumbnailLink()
      });
    }
    
    // Sort by created timestamp descending (newest first)
    result.sort(function(a, b) {
      return b.created - a.created;
    });
    
    var output = JSON.stringify({ 
      success: true, 
      files: result 
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
