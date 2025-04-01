// Type declaration for Chart.js
interface ChartInstance {
  destroy: () => void;
}

// Declare Chart.js on window
declare global {
  interface Window {
    Chart: {
      getChart: (canvas: HTMLCanvasElement) => ChartInstance | undefined;
      new (canvas: HTMLCanvasElement, config: any): ChartInstance;
    };
  }
}

export {}; // This makes the file a module