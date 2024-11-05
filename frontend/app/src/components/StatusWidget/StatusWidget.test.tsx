/**
 * Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2024)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from "react"

import "@testing-library/jest-dom"
import { fireEvent, screen, waitFor } from "@testing-library/react"

import {
  mockTheme,
  render,
  ScriptRunState,
  SessionEvent,
} from "@streamlit/lib"
import { ConnectionState } from "@streamlit/app/src/connection/ConnectionState"
import { SessionEventDispatcher } from "@streamlit/app/src/SessionEventDispatcher"

import StatusWidget, { StatusWidgetProps } from "./StatusWidget"

const getProps = (
  propOverrides: Partial<StatusWidgetProps> = {}
): StatusWidgetProps => ({
  connectionState: ConnectionState.CONNECTED,
  sessionEventDispatcher: new SessionEventDispatcher(),
  scriptRunState: ScriptRunState.RUNNING,
  rerunScript: jest.fn(),
  stopScript: () => {},
  allowRunOnSave: true,
  theme: mockTheme.emotion,
  ...propOverrides,
})

describe("StatusWidget element", () => {
  it("renders a StatusWidget", () => {
    render(<StatusWidget {...getProps()} />)

    expect(screen.getByTestId("stStatusWidget")).toBeInTheDocument()
  })

  it("renders its tooltip when connecting", () => {
    render(
      <StatusWidget
        {...getProps({ connectionState: ConnectionState.CONNECTING })}
      />
    )

    expect(screen.getByTestId("stStatusWidget")).toBeInTheDocument()
    expect(screen.getByText("Connecting")).toBeInTheDocument()
    expect(screen.getByTestId("stTooltipHoverTarget")).toBeInTheDocument()
  })

  it("renders its tooltip when disconnected", () => {
    render(
      <StatusWidget
        {...getProps({
          connectionState: ConnectionState.DISCONNECTED_FOREVER,
        })}
      />
    )

    expect(screen.getByTestId("stStatusWidget")).toBeInTheDocument()
    expect(screen.getByText("Error")).toBeInTheDocument()
    expect(screen.getByTestId("stTooltipHoverTarget")).toBeInTheDocument()
  })

  it("renders its tooltip when running and minimized", async () => {
    jest.useFakeTimers()
    render(<StatusWidget {...getProps()} />)
    expect(
      screen.queryByTestId("stTooltipHoverTarget")
    ).not.toBeInTheDocument()

    // Set scrollY so shouldMinimize returns true
    global.scrollY = 50

    render(<StatusWidget {...getProps()} />)
    await waitFor(
      () => {
        expect(screen.getByTestId("stTooltipHoverTarget")).toBeInTheDocument()
      },
      {
        timeout: 550,
      }
    )

    // Reset scrollY for following tests not impacted
    global.scrollY = 0
    jest.useRealTimers()
  })

  it("does not render its tooltip when connected", () => {
    render(
      <StatusWidget
        {...getProps({ connectionState: ConnectionState.CONNECTED })}
      />
    )

    expect(
      screen.queryByTestId("stTooltipHoverTarget")
    ).not.toBeInTheDocument()
  })

  it("sets and unsets the sessionEventConnection", () => {
    const sessionEventDispatcher = new SessionEventDispatcher()
    const connectSpy = jest.fn()
    const disconnectSpy = jest.fn()
    sessionEventDispatcher.onSessionEvent.connect =
      connectSpy.mockImplementation(() => ({
        disconnect: disconnectSpy,
      }))

    const { unmount } = render(
      <StatusWidget {...getProps({ sessionEventDispatcher })} />
    )

    expect(connectSpy).toHaveBeenCalled()

    unmount()

    expect(disconnectSpy).toHaveBeenCalled()
  })

  it("calls stopScript when clicked", async () => {
    jest.useFakeTimers()
    const stopScript = jest.fn()
    render(<StatusWidget {...getProps({ stopScript })} />)

    const baseButtonHeader = await screen.findByTestId("stBaseButton-header")

    fireEvent.click(baseButtonHeader)

    expect(stopScript).toHaveBeenCalled()
    jest.useRealTimers()
  })

  it("shows the rerun button when script changes", () => {
    const sessionEventDispatcher = new SessionEventDispatcher()
    const rerunScript = jest.fn()

    render(
      <StatusWidget
        {...getProps({
          rerunScript,
          sessionEventDispatcher,
          scriptRunState: ScriptRunState.NOT_RUNNING,
        })}
      />
    )

    sessionEventDispatcher.handleSessionEventMsg(
      new SessionEvent({
        scriptChangedOnDisk: true,
        scriptWasManuallyStopped: null,
        scriptCompilationException: null,
      })
    )

    const buttons = screen.getAllByRole("button")
    expect(buttons).toHaveLength(2)

    expect(buttons[0]).toHaveTextContent("Rerun")
    expect(buttons[1]).toHaveTextContent("Always rerun")

    // Click "Rerun" button
    fireEvent.click(buttons[0])

    expect(rerunScript).toHaveBeenCalledWith(false)
  })

  it("shows the always rerun button when script changes", () => {
    const sessionEventDispatcher = new SessionEventDispatcher()
    const rerunScript = jest.fn()

    render(
      <StatusWidget
        {...getProps({
          rerunScript,
          sessionEventDispatcher,
          scriptRunState: ScriptRunState.NOT_RUNNING,
        })}
      />
    )

    sessionEventDispatcher.handleSessionEventMsg(
      new SessionEvent({
        scriptChangedOnDisk: true,
        scriptWasManuallyStopped: null,
        scriptCompilationException: null,
      })
    )

    const buttons = screen.getAllByRole("button")
    expect(buttons).toHaveLength(2)

    expect(buttons[0]).toHaveTextContent("Rerun")
    expect(buttons[1]).toHaveTextContent("Always rerun")

    // Click "Always Rerun" button
    fireEvent.click(buttons[1])

    expect(rerunScript).toHaveBeenCalledWith(true)
  })

  it("does not show the always rerun button when script changes", () => {
    const sessionEventDispatcher = new SessionEventDispatcher()
    const rerunScript = jest.fn()

    render(
      <StatusWidget
        {...getProps({
          rerunScript,
          sessionEventDispatcher,
          scriptRunState: ScriptRunState.NOT_RUNNING,
          allowRunOnSave: false,
        })}
      />
    )

    sessionEventDispatcher.handleSessionEventMsg(
      new SessionEvent({
        scriptChangedOnDisk: true,
        scriptWasManuallyStopped: null,
        scriptCompilationException: null,
      })
    )
    const buttons = screen.getAllByRole("button")
    expect(buttons).toHaveLength(1)

    expect(buttons[0]).toHaveTextContent("Rerun")
  })

  it("calls always run on save", () => {
    const sessionEventDispatcher = new SessionEventDispatcher()
    const rerunScript = jest.fn()

    render(
      <StatusWidget
        {...getProps({
          rerunScript,
          sessionEventDispatcher,
          scriptRunState: ScriptRunState.NOT_RUNNING,
        })}
      />
    )

    sessionEventDispatcher.handleSessionEventMsg(
      new SessionEvent({
        scriptChangedOnDisk: true,
        scriptWasManuallyStopped: null,
        scriptCompilationException: null,
      })
    )
    // Verify the Always rerun is visible
    expect(screen.getByText("Always rerun")).toBeInTheDocument()

    fireEvent.keyDown(document.body, {
      key: "a",
      which: 65,
    })

    expect(rerunScript).toHaveBeenCalledWith(true)
  })
})

describe("Running Icon", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("renders regular running gif before New Years", async () => {
    jest.setSystemTime(new Date("December 30, 2022 23:59:00"))

    render(
      <StatusWidget
        {...getProps({ scriptRunState: ScriptRunState.RUNNING })}
      />
    )

    const icon = await screen.findByRole("img")
    expect(icon).toHaveAttribute("src", "icon_running.gif")
  })

  it("renders firework gif on Dec 31st", async () => {
    jest.setSystemTime(new Date("December 31, 2022 00:00:00"))

    render(
      <StatusWidget
        {...getProps({ scriptRunState: ScriptRunState.RUNNING })}
      />
    )

    const icon = await screen.findByRole("img")
    expect(icon).toHaveAttribute("src", "fireworks.gif")
  })

  it("renders firework gif on Jan 6th", async () => {
    jest.setSystemTime(new Date("January 6, 2023 23:59:00"))

    render(
      <StatusWidget
        {...getProps({ scriptRunState: ScriptRunState.RUNNING })}
      />
    )

    const icon = await screen.findByRole("img")
    expect(icon).toHaveAttribute("src", "fireworks.gif")
  })

  it("renders regular running gif after New Years", async () => {
    jest.setSystemTime(new Date("January 7, 2023 00:00:00"))

    render(
      <StatusWidget
        {...getProps({ scriptRunState: ScriptRunState.RUNNING })}
      />
    )

    const icon = await screen.findByRole("img")
    expect(icon).toHaveAttribute("src", "icon_running.gif")
  })

  it("delays render of running gif", () => {
    render(
      <StatusWidget
        {...getProps({ scriptRunState: ScriptRunState.RUNNING })}
      />
    )

    let icon = screen.queryByRole("img")
    expect(icon).not.toBeInTheDocument()

    jest.runAllTimers()

    icon = screen.queryByRole("img")
    expect(icon).toHaveAttribute("src", "icon_running.gif")
  })
})
