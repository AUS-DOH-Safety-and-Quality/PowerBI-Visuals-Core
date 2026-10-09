import { describe, expect, it } from "vitest";
import { createPlotFrame, rescalePlotFrame, valueTickFormat } from "../src/rendering/index";
import { settings, palette } from "./browserHelpers";

const options = {
  width: 400,
  height: 300,
  displayPlot: true,
  x: { lower: 0, upper: 10 },
  y: { lower: -5, upper: 5 },
  settings,
  palette
};

describe("plot frame", () => {
  it("pads from the canvas settings and scales each axis into the padded range", () => {
    const frame = createPlotFrame(options);
    expect(frame).toMatchObject({ width: 400, height: 300, displayPlot: true });
    expect(frame.xAxis).toMatchObject({ lower: 0, upper: 10, start_padding: 10, end_padding: 10 });
    expect(frame.yAxis).toMatchObject({ lower: -5, upper: 5, start_padding: 10, end_padding: 10 });
    expect(frame.xScale(0)).toBe(10);
    expect(frame.xScale(10)).toBe(390);
    expect(frame.yScale(-5)).toBe(290);
    expect(frame.yScale(5)).toBe(10);
  });

  it("reserves each axis title's font size beside the canvas padding", () => {
    const titled = {
      ...settings,
      x_axis: { ...settings.x_axis, xlimit_label: "Date", xlimit_label_size: 14 },
      y_axis: { ...settings.y_axis, ylimit_label: "Value", ylimit_label_size: 12 }
    };
    const frame = createPlotFrame({ ...options, settings: titled });
    expect(frame.xAxis.start_padding).toBe(22);
    expect(frame.yAxis.start_padding).toBe(24);
    expect(frame.xAxis.end_padding).toBe(10);
  });

  it("rescales over new paddings without touching the ranges", () => {
    const frame = rescalePlotFrame(createPlotFrame(options), { left: 50, right: 20, top: 5, bottom: 15 });
    expect(frame.xAxis).toMatchObject({ lower: 0, upper: 10, start_padding: 50, end_padding: 20 });
    expect(frame.yAxis).toMatchObject({ lower: -5, upper: 5, start_padding: 15, end_padding: 5 });
    expect(frame.xScale(0)).toBe(50);
    expect(frame.xScale(10)).toBe(380);
    expect(frame.yScale(-5)).toBe(285);
    expect(frame.yScale(5)).toBe(5);
  });

  it("formats ticks to fixed decimals, with a percent sign when scaled", () => {
    expect(valueTickFormat(2, false)(1.2345)).toBe("1.23");
    expect(valueTickFormat(0, true)(12.6)).toBe("13%");
  });
});
