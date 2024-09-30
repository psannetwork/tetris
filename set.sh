#!/bin/bash

REPO_URL="https://github.com/hirotomoki12345/tetris.git"
REPO_DIR="tetris/v7"

setup_server() {
    echo "Cloning repository..."
    git clone "$REPO_URL" || { echo "Failed to clone repository"; exit 1; }

    cd "$REPO_DIR" || { echo "Failed to enter directory $REPO_DIR"; exit 1; }

    echo "Installing dependencies..."
    npm install || { echo "Failed to install dependencies"; exit 1; }

    echo "Starting server with PM2..."
    sudo pm2 start npm --name "tetris-server" -- start || { echo "Failed to start server with PM2"; exit 1; }

    echo "Setting up PM2 to start on boot..."
    sudo pm2 startup || { echo "Failed to set up PM2 startup"; exit 1; }
    sudo pm2 save || { echo "Failed to save PM2 configuration"; exit 1; }

    echo "Setup complete."
}

# Function to start the server
start_server() {
    setup_server
    echo "Starting server with PM2..."
    sudo pm2 start npm --name "tetris-server" -- start || { echo "Failed to start server with PM2"; exit 1; }
    echo "Server started."
}

# Function to stop and delete the server
delete_server() {
    echo "Checking if server is running..."
    if sudo pm2 list | grep -q "tetris-server"; then
        echo "Stopping server with PM2..."
        sudo pm2 stop "tetris-server" || { echo "Failed to stop server with PM2"; exit 1; }
        echo "Deleting server from PM2..."
        sudo pm2 delete "tetris-server" || { echo "Failed to delete server with PM2"; exit 1; }
    else
        echo "Server is not running or does not exist."
    fi
    echo "Server deleted."
}

# Function to restart the server
restart_server() {
    echo "Restarting server with PM2..."
    sudo pm2 restart "tetris-server" || { echo "Failed to restart server with PM2"; exit 1; }
    echo "Server restarted."
}

# Function to show PM2 logs
show_logs() {
    echo "Displaying PM2 logs..."
    sudo pm2 logs "tetris-server"
}

# Main menu
while true; do
    echo "Choose an option:"
    echo "1. Start server"
    echo "2. Delete server"
    echo "3. Restart server"
    echo "4. View errors"
    echo "5. Quit"

    read -r choice
    case $choice in
        1) start_server ;;
        2) delete_server ;;
        3) restart_server ;;
        4) show_logs ;;
        5) echo "Exiting."; exit ;;
        *) echo "Invalid option, please try again." ;;
    esac
done
