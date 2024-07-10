const { app, globalShortcut, clipboard, dialog, BrowserWindow } = require('electron');
const { createWorker } = require('tesseract.js');
const path = require('path')
let dialogWindow;

function createDialogWindow() {
    dialogWindow = new BrowserWindow({
        width: 600,
        height: 400,
        show: false, // Initially hidden
        autoHideMenuBar: true, // Hide the menu bar
        // frame: false,
        alwaysOnTop: true, // Make the window always on top
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    dialogWindow.loadFile(path.join(__dirname, 'index.html'));
    dialogWindow.once('ready-to-show', () => {
        dialogWindow.show();
    });

    dialogWindow.on('closed', () => {
        dialogWindow = null;
    });
}

function clearWhitespaceAndSymbols(str) {
    // Remove whitespace and symbols using regular expressions
    return str.replace(/\s+/g, '').replace(/[^\w\s]/gi, '');
}

async function recognizeTextFromDataURL(dataURL) {
    const worker = await createWorker('eng');

    try {
        const { data: { text } } = await worker.recognize(dataURL);
        console.log('Recognized Text:', text);
        return text;
    } catch (error) {
        console.error('Error during OCR:', error);
        throw error;
    } finally {
        await worker.terminate();
    }
}

async function printClipboardText() {
    const text = clipboard.readText();
    console.log(text)
    if(!text){
        dialog.showErrorBox('Error', 'No text found in clipboard.');
    }else{
        checkDictionary(text);
    }

}

async function checkDictionary(word){
    word = clearWhitespaceAndSymbols(word);
    try{
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
                
        if(!response.ok){
            throw new Error("Unable to translate the text")
        }
    
        const json = await response.json();
        
        console.log(json)
        if(!dialogWindow) {
            createDialogWindow();
            dialogWindow.webContents.on('did-finish-load', () => {
                dialogWindow.webContents.send('dictionary-data', json[0]);
            });
        }else {
            // dialogWindow.webContents.on('did-finish-load', () => {
                dialogWindow.webContents.send('dictionary-data', json[0]);
                dialogWindow.show();
            // });
        }
    } catch (error) {
        dialog.showErrorBox('Error', 'Failed to recognize text.');
    }


}

async function printClipboardImage() {
    const image = clipboard.readImage();

    if (!image.isEmpty()) {
            const dataURL = image.toDataURL();
            const recognizedText = await recognizeTextFromDataURL(dataURL);
            
            checkDictionary(recognizedText);            
    } else {
        dialog.showErrorBox('Error', 'No image found in clipboard.');
    }
}

app.on('ready', () => {
    // createDialogWindow();
    // Register global shortcut for Ctrl+P
    globalShortcut.register('CommandOrControl+I', () => {
        printClipboardImage();
    });

    globalShortcut.register('CommandOrControl+T', () => {
        printClipboardText();
    });
});

// Unregister all global shortcuts when the app is quitting
app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
