import { createInterface } from 'node:readline';
import c from 'picocolors';

/**
 * Interactive option selection utility with arrow key navigation
 * @param options Array of options with name and description
 * @returns Promise resolving to the selected option name
 */
export async function getOption(
  question: string,
  options: { name: string; description?: string }[]
): Promise<string> {
  if (!options || !options.length) {
    throw new Error('No options provided for selection');
  }

  // Set up terminal events
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let selectedIndex = 0;

  // Function to clear previous render and move cursor
  const clearPrevious = () => {
    process.stdout.write(`\x1B[${options.length + 1}A`); // Move up to start of options
    process.stdout.write('\x1B[0J'); // Clear from cursor to end of screen
  };

  // Function to render options
  const renderOptions = () => {
    console.log(c.cyan(question));
    options.forEach((option, index) => {
      const isSelected = index === selectedIndex;
      const prefix = isSelected ? c.green('❯ ') : '  ';
      const optionText = isSelected ? c.bold(option.name) : option.name;
      const suffix = option.description ? ` - ${option.description}` : '';
      console.log(`${prefix}${optionText}${suffix}`);
    });
  };

  // Initial render
  renderOptions();

  // Create a promise that will resolve when selection is made
  return new Promise<string>(resolve => {
    // Setup raw mode for arrow key input
    process.stdin.setRawMode(true);

    // Handle keypress events
    const handleKeypress = (str, key) => {
      if (!key) return;

      if (key.name === 'up' && selectedIndex > 0) {
        selectedIndex--;
        clearPrevious();
        renderOptions();
      } else if (key.name === 'down' && selectedIndex < options.length - 1) {
        selectedIndex++;
        clearPrevious();
        renderOptions();
      } else if (key.name === 'return') {
        // Clean up on Enter key
        process.stdin.removeListener('keypress', handleKeypress);

        // Restore terminal settings
        process.stdin.setRawMode(false);

        // Close the readline interface
        readline.close();

        // Clear the selection UI
        clearPrevious();

        // Return the selected option name
        resolve(options[selectedIndex].name);
      } else if (key.name === 'escape' || (key.name === 'c' && key.ctrl)) {
        // Handle escape or ctrl+c
        process.stdin.removeListener('keypress', handleKeypress);
        process.stdin.setRawMode(false);
        readline.close();
        process.exit(0);
      }
    };

    // Set up keypress listener
    process.stdin.on('keypress', handleKeypress);
  });
}
