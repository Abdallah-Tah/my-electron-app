const { app, BrowserWindow, ipcMain, Tray, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const axios = require("axios");
const sql = require("mssql");
const { print } = require("pdf-to-printer");

app.setPath(
  "userData",
  path.join(app.getPath("temp"), "my-electron-app-cache")
);

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
let tray;

// Function to check and print PDF
const checkAndPrintPDF = async () => {
  try {
    await sql.connect(config);
    const pcName = os.hostname();
    const result =
      await sql.query`SELECT * FROM print_requests WHERE pc_name = ${pcName}`;

    // console.log("Records from DB:", result.recordset);

    // Send the records to the renderer process
    mainWindow.webContents.send("update-records", result.recordset);

    const pendingRecords = result.recordset.filter(
      (record) => record.status === "pending"
    );

    for (const record of pendingRecords) {
      const url = `http://laravel-test${record.file_path}`;
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

// Schedule to run every minute
setInterval(checkAndPrintPDF, 60000);

// Create hidden window
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false, // Do not show the window
    skipTaskbar: true, // Do not show in the taskbar
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.on("minimize", (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on("close", (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }

    return false;
  });
};

// Create tray
const createTray = () => {
  const iconPath = path.join(__dirname, "..", "assets", "icon", "icon.png"); // Ensure this path is correct
  if (fs.existsSync(iconPath)) {
    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show App",
        click: () => {
          mainWindow.show();
        },
      },
      {
        label: "Quit",
        click: () => {
          app.isQuiting = true;
          app.quit();
        },
      },
    ]);

    tray.setToolTip("My Electron App");
    tray.setContextMenu(contextMenu);

    tray.on("click", () => {
      mainWindow.show();
    });
  } else {
    console.error(`Failed to load image from path '${iconPath}'`);
  }
};

app.whenReady().then(() => {
  createWindow();
  createTray();

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
