const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const sql = require("mssql");
const { print } = require("pdf-to-printer");

// SQL Server configuration
const config = {
  user: "your-username",
  password: "your-password",
  server: "your-server-address", // Replace with your actual server address
  database: "your-database-name",
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
    const pcName = require("os").hostname();
    const result =
      await sql.query`SELECT * FROM your_table WHERE pc_name = ${pcName} AND status = 'pending'`;

    for (const record of result.recordset) {
      const filePath = path.join(record.pdf_path, record.file_name);
      print(filePath)
        .then(() => {
          console.log(`Printed: ${filePath}`);
          mainWindow.webContents.send("update-status", {
            id: record.id,
            status: "printed",
          });
          sql.query`UPDATE your_table SET status = 'printed' WHERE id = ${record.id}`;
        })
        .catch((err) => {
          console.error(err);
          mainWindow.webContents.send("update-status", {
            id: record.id,
            status: "error",
          });
        });
    }
  } catch (err) {
    console.error(err);
  }
};

// Schedule to run every minute
setInterval(checkAndPrintPDF, 60000);

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
    await sql.query`UPDATE your_table SET status = 'pending' WHERE id = ${id}`;
    checkAndPrintPDF(); // Trigger immediate check after reprint request
  } catch (err) {
    console.error(err);
  }
});
