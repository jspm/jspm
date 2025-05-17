// 404 page template
export default `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Module Not Found | JSPM</title>
    <style>
        :root {
            --jspm-yellow: rgb(226, 200, 35);
            --jspm-yellow-light: rgba(226, 200, 35, 0.08);
            --jspm-grey: #333333;
            --jspm-light-grey: #F9F9F9;
            --jspm-medium-grey: #666666;
            --jspm-border-grey: #EEEEEE;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        
        body {
            background-color: var(--jspm-light-grey);
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: var(--jspm-grey);
        }
        
        .container {
            max-width: 580px;
            width: 100%;
        }

        .code-text {
            font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
            background-color: var(--jspm-code-bg);
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 14px;
        }
        
        .error-card {
            background-color: white;
            border-radius: 6px;
            padding: 40px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
            border: 1px solid var(--jspm-border-grey);
            position: relative;
        }
        
        .logo-container {
            display: flex;
            align-items: center;
            margin-bottom: 36px;
        }
        
        .logo {
            width: 38px;
            height: 38px;
        }
        
        .error-code {
            font-size: 14px;
            color: var(--jspm-medium-grey);
            font-weight: 500;
            background: var(--jspm-yellow-light);
            padding: 5px 12px;
            border-radius: 6px;
            margin-left: auto;
        }
        
        h1 {
            font-size: 26px;
            color: var(--jspm-grey);
            margin-bottom: 16px;
            font-weight: 600;
            letter-spacing: -0.3px;
            display: inline-block;
            border-bottom: 3px solid var(--jspm-yellow);
            padding-bottom: 8px;
        }
        
        .message {
            font-size: 16px;
            color: var(--jspm-medium-grey);
            line-height: 1.6;
            margin-bottom: 32px;
            max-width: 480px;
        }
        
        .back-button {
            display: inline-flex;
            align-items: center;
            background-color: white;
            color: var(--jspm-grey);
            font-weight: 500;
            font-size: 15px;
            padding: 10px 20px;
            border-radius: 6px;
            text-decoration: none;
            transition: all 0.2s ease;
            border: 1px solid var(--jspm-border-grey);
        }
        
        .back-button:hover {
            border-color: var(--jspm-yellow);
            background-color: var(--jspm-yellow-light);
        }
        
        .back-arrow {
            margin-right: 8px;
            font-size: 18px;
            line-height: 0;
        }
        
        @media (max-width: 480px) {
            .error-card {
                padding: 30px 24px;
            }
            
            h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-card">
            <div class="logo-container">
                <img src="/jspm.png" alt="JSPM Logo" class="logo">
                <span class="error-code">404</span>
            </div>
            
            <h1>Not Found</h1>
            
            <div class="message">
                Unknown path
            </div>
            
            <a href="/" class="back-button">
                <span class="back-arrow">←</span>
                Return to Home
            </a>
        </div>
    </div>
</body>
</html>`;
