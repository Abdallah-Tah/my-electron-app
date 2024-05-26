const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const axios = require("axios");
const sql = require("mssql");
const { print } = require("pdf-to-printer");

// SQL Server configuration
const config = {
  user: "laravel_test",
  password: "password",
  server: "BKAVXSQL",
  database: "LARAVEL_TEST",
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

let mainWindow;

// Function to check and print PDF
const checkAndPrintPDF = async () => {
  try {
    await sql.connect(config);
    const pcName = os.hostname();
    const result =
      await sql.query`SELECT * FROM print_requests WHERE pc_name = ${pcName} AND status = 'pending'`;

    // Send the records to the renderer process
    mainWindow.webContents.send("update-records", result.recordset);

    for (const record of result.recordset) {
      const url = `http://127.0.0.1:8025${record.file_path}`;
      const localFilePath = path.join(os.tmpdir(), record.file_name);

      // Download the PDF file
      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
      });

      response.data
        .pipe(fs.createWriteStream(localFilePath))
        .on("finish", async () => {
          try {
            // Print the downloaded PDF file
            await print(localFilePath);
            console.log(`Printed: ${localFilePath}`);
            mainWindow.webContents.send("update-status", {
              id: record.id,
              status: "completed",
            });
            await sql.query`UPDATE print_requests SET status = 'completed' WHERE id = ${record.id}`;
          } catch (err) {
            console.error(err);
            mainWindow.webContents.send("update-status", {
              id: record.id,
              status: "failed",
            });
            await sql.query`UPDATE print_requests SET status = 'failed' WHERE id = ${record.id}`;
          }
        })
        .on("error", async (err) => {
          console.error("Error downloading file:", err);
          mainWindow.webContents.send("update-status", {
            id: record.id,
            status: "failed",
          });
          await sql.query`UPDATE print_requests SET status = 'failed' WHERE id = ${record.id}`;
        });
    }
  } catch (err) {
    console.error(err);
  }
};

// Schedule to run every 2.5ms
setInterval(checkAndPrintPDF, 2500);

// Create window
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
};

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on("reprint", async (event, id) => {
  try {
    await sql.connect(config);
    await sql.query`UPDATE print_requests SET status = 'pending' WHERE id = ${id}`;
    checkAndPrintPDF(); // Trigger immediate check after reprint request
  } catch (err) {
    console.error(err);
  }
});
