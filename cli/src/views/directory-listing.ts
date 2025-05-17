import { readdir, stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

// Generate HTML directory listing
export default async function generateDirectoryListing(
  directoryPath: string,
  requestPath: string,
  appBasePath: string
): Promise<string> {
  const files = await readdir(directoryPath, { withFileTypes: true });
  const packageName = basename(appBasePath.replace(/^\//, ""));

  // Get file sizes
  const fileSizes = new Map<string, number>();
  for (const file of files) {
    if (!file.isDirectory()) {
      try {
        const stats = await stat(join(directoryPath, file.name));
        fileSizes.set(file.name, stats.size);
      } catch (err) {
        fileSizes.set(file.name, 0);
      }
    }
  }

  // Generate breadcrumb path parts
  const pathParts: string[] = [];
  let currentPath = "";
  const pathSegments = requestPath.split("/").filter((p) => p);

  if (pathSegments.length > 0) {
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      currentPath += `/${segment}`;
      const isLast = i === pathSegments.length - 1;

      if (isLast) {
        pathParts.push(`<span class="path-current">${segment}</span>`);
      } else {
        pathParts.push(
          `<a href="${appBasePath}${currentPath}/" class="path-link">${segment}</a>`
        );
      }

      if (!isLast) {
        pathParts.push(`<span class="path-separator">/</span>`);
      }
    }
  }

  // Format file size
  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Create HTML
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${packageName} | JSPM</title>
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
    <style>
        :root {
            --jspm-yellow: rgb(226, 200, 35);
            --jspm-yellow-light: rgba(226, 200, 35, 0.08);
            --jspm-grey: #333333;
            --jspm-light-grey: #F9F9F9;
            --jspm-medium-grey: #666666;
            --jspm-border-grey: #EEEEEE;
            --jspm-link-color: #0366d6;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        body {
            background-color: var(--jspm-light-grey);
            color: var(--jspm-grey);
            padding: 20px;
            line-height: 1.5;
        }

        .container {
            max-width: 1100px;
            margin: 0 auto;
        }

        .card {
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
            border: 1px solid var(--jspm-border-grey);
            overflow: hidden;
        }

        .header {
            padding: 24px 32px;
            display: flex;
            align-items: center;
            border-bottom: 1px solid var(--jspm-border-grey);
        }

        .logo {
            width: 30px;
            height: 30px;
            margin-right: 16px;
            margin-top: 1px;
        }

        .path-container {
            flex: 1;
            overflow: hidden;
        }

        .package-name-link {
            font-weight: 600;
            font-size: 15px;
            color: var(--jspm-grey);
            text-decoration: none;
            transition: color 0.2s;
            display: inline-block;
            margin-bottom: 4px;
        }

        .package-name-link:hover {
            color: var(--jspm-link-color);
        }

        .path {
            font-size: 18px;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .path-parts {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 4px;
        }

        .path-separator {
            color: var(--jspm-medium-grey);
            margin: 0 2px;
        }

        .path-link {
            color: var(--jspm-link-color);
            text-decoration: none;
        }

        .path-link:hover {
            text-decoration: underline;
        }

        .path-current {
            font-weight: 600;
        }

        .listing {
            padding: 0;
            list-style: none;
        }

        .listing-item {
            padding: 0;
            border-bottom: 1px solid var(--jspm-border-grey);
        }

        .listing-item:last-child {
            border-bottom: none;
        }

        .listing-link {
            padding: 14px 32px;
            display: flex;
            align-items: center;
            text-decoration: none;
            color: var(--jspm-grey);
            transition: background-color 0.1s ease;
        }

        .listing-link:hover {
            background-color: var(--jspm-yellow-light);
        }

        .icon {
            margin-right: 12px;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .name {
            flex: 1;
            font-size: 15px;
            color: var(--jspm-link-color);
        }

        .symlink-target {
            color: var(--jspm-medium-grey);
            font-size: 14px;
            margin-left: 12px;
        }

        .size {
            color: var(--jspm-medium-grey);
            font-size: 14px;
            text-align: right;
            min-width: 80px;
        }

        .empty-message {
            padding: 40px;
            text-align: center;
            color: var(--jspm-medium-grey);
            font-style: italic;
        }

        .parent-dir {
            color: var(--jspm-medium-grey);
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
            margin-top: 20px;
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

        .source-info-bar {
            background-color: #f6f8fa;
            border-bottom: 1px solid var(--jspm-border-grey);
            padding: 12px 32px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
            color: var(--jspm-medium-grey);
        }

        .file-path {
            flex: 1;
            overflow: hidden;
        }

        @media (max-width: 600px) {
            .header, .listing-link {
                padding-left: 20px;
                padding-right: 20px;
            }

            .path-container {
                margin-top: 12px;
                max-width: 100%;
            }

            .source-info-bar {
                padding: 12px 20px;
            }

            .symlink-target {
                display: none;
            }

            .header {
                flex-direction: column;
                align-items: flex-start;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <img src="/jspm.png" alt="JSPM Logo" class="logo">
                <div class="path-container">
                    <a href="${appBasePath}/" class="package-name-link">${packageName}</a>
                </div>
            </div>

            <div class="source-info-bar">
                <div class="file-path">
                    <div class="path-parts">
                      ${
                        pathParts.length > 0
                          ? pathParts.join("")
                          : '<span class="path-current">Root</span>'
                      }
                    </div>
                </div>
            </div>

            <ul class="listing">
`;

  // Add parent directory link if not at root
  if (requestPath !== "/") {
    const parentPath = dirname(requestPath);
    const parentUrl = `${appBasePath}${parentPath}`;
    html += `
<li class="listing-item">
  <a href="${parentUrl}" class="listing-link">
    <div class="icon">
      <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
    </div>
    <span class="name parent-dir">..</span>
    <span class="size"></span>
  </a>
</li>`;
  }

  // Sort entries: directories first, then files
  const sortedFiles = files.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  // Add entries
  for (const file of sortedFiles) {
    const name = file.name;
    const filePath = join(requestPath, name);
    // Prepend the app base path for URLs
    const href = `${appBasePath}${filePath}${file.isDirectory() ? "/" : ""}`;
    const fileSize = fileSizes.get(name);

    if (file.isDirectory()) {
      html += `
<li class="listing-item">
  <a href="${href}" class="listing-link">
    <div class="icon">
      <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
    </div>
    <span class="name">${name}/</span>
    <span class="size"></span>
  </a>
</li>`;
    } else {
      html += `
<li class="listing-item">
  <a href="${href}" class="listing-link">
    <div class="icon">
      <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
    </div>
    <span class="name">${name}</span>
    <span class="size">${formatFileSize(fileSize || 0)}</span>
  </a>
</li>`;
    }
  }

  if (files.length === 0) {
    html += `
<li class="empty-message">This directory is empty</li>`;
  }

  html += `
            </ul>
        </div>
    </div>
</body>
</html>`;

  return html;
}
