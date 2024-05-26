# My Electron App

My Electron App is an application that reads records from a SQL Server table, detects the PC name, and prints PDF files directly to the default printer when the table has records with a status of 'pending'. The app runs on a schedule to listen to the table and perform printing tasks.

## Features

- Electron-based desktop application.
- Reads records from a SQL Server table.
- Detects PC name to match records.
- Prints PDF files directly to the default printer.
- Updates the status of printed records.
- User interface to display the status of each file.
- Option to reprint files by updating their status to 'pending'.

## Prerequisites

- Node.js and npm
- SQL Server
- Electron

## Installation

1. **Clone the repository:**

    ```sh
    git clone https://github.com/Abdallah-Tah/my-electron-app.git
    cd my-electron-app
    ```

2. **Install dependencies:**

    ```sh
    npm install
    ```

3. **Set up Tailwind CSS:**

    Build Tailwind CSS to generate the `dist/styles.css` file.

    ```sh
    npm run build:css
    ```

## Configuration

1. **SQL Server Configuration:**

    Update the SQL Server configuration in `src/index.js` with your database details:

    ```javascript
    const config = {
        user: 'your-username',
        password: 'your-password',
        server: 'your-server-address',
        database: 'your-database-name',
        options: {
            encrypt: true,
            trustServerCertificate: true,
        },
    };
    ```

## Running the Application

1. **Start the application:**

    ```sh
    npm start
    ```

2. **Building Tailwind CSS:**

    If you make changes to the CSS, rebuild it:

    ```sh
    npm run build:css
    ```

## Usage

- The app will run in the background, checking the SQL Server table every minute for records with a status of 'pending'.
- When a matching record is found, the app will print the PDF file specified in the record.
- The status of the printed record will be updated to 'printed'.
- The user interface displays the status of each file.
- You can reprint files by clicking the 'Reprint' button, which updates the status to 'pending'.

## Troubleshooting

- Ensure that the SQL Server configuration is correct and that the server is reachable.
- Check the console for error messages if the app fails to print files.
- Verify that the paths to the PDF files are correct and that the files are accessible.

## Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -am 'Add new feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Create a new Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Electron](https://www.electronjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Node.js](https://nodejs.org/)
- [mssql](https://www.npmjs.com/package/mssql)
- [pdf-to-printer](https://www.npmjs.com/package/pdf-to-printer)
