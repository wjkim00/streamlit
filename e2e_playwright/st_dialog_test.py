# Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2024)
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import re

import pytest
from playwright.sync_api import Page, expect

from e2e_playwright.conftest import ImageCompareFunction, wait_for_app_run
from e2e_playwright.shared.app_utils import (
    COMMAND_KEY,
    check_top_level_class,
    click_button,
    expect_exception,
    expect_markdown,
    expect_no_exception,
    get_button,
    get_markdown,
)

modal_test_id = "stDialog"


def open_dialog_with_images(app: Page):
    app.get_by_role("button").filter(has_text="Open Dialog with Images").click()


def open_dialog_without_images(app: Page, *, delay: int = 0):
    app.get_by_role("button").filter(has_text="Open Dialog without Images").click(
        delay=delay
    )


def open_largewidth_dialog(app: Page):
    app.get_by_role("button").filter(has_text="Open large-width Dialog").click()


def open_headings_dialogs(app: Page):
    app.get_by_role("button").filter(has_text="Open headings Dialog").click()


def open_sidebar_dialog(app: Page):
    app.get_by_role("button").filter(has_text="Open Sidebar-Dialog").click()


def open_dialog_with_internal_error(app: Page):
    app.get_by_role("button").filter(has_text="Open Dialog with Key Error").click()


def open_nested_dialogs(app: Page):
    app.get_by_role("button").filter(has_text="Open Nested Dialogs").click()


def open_submit_button_dialog(app: Page):
    app.get_by_role("button").filter(has_text="Open submit-button Dialog").click()


def open_dialog_with_copy_buttons(app: Page):
    app.get_by_role("button").filter(has_text="Open Dialog with Copy Buttons").click()


def open_dialog_with_deprecation_warning(app: Page):
    app.get_by_role("button").filter(
        has_text="Open Dialog with deprecation warning"
    ).click()


def open_dialog_with_chart(app: Page):
    app.get_by_role("button").filter(has_text="Open Chart Dialog").click()


def click_to_dismiss(app: Page):
    # Click somewhere outside the close popover container:
    app.keyboard.press("Escape")


def test_displays_dialog_properly(app: Page):
    """Test that dialog is displayed properly."""
    open_dialog_with_images(app)
    wait_for_app_run(app)
    main_dialog = app.get_by_test_id(modal_test_id)
    expect(main_dialog).to_have_count(1)

    # Verify that we don't print a deprecation warning for usage of @st.dialog. We check
    # that a warning is printed for @st.experimental_dialog in a later test.
    expect(app.get_by_test_id("stAlert")).not_to_be_attached()


def test_dialog_closes_properly(app: Page):
    """Test that dialog closes after clicking on action button."""
    open_dialog_with_images(app)
    wait_for_app_run(app)
    main_dialog = app.get_by_test_id(modal_test_id)
    expect(main_dialog).to_have_count(1)
    close_button = main_dialog.get_by_test_id("stButton").locator("button").first
    close_button.scroll_into_view_if_needed()
    close_button.click()
    wait_for_app_run(app)
    main_dialog = app.get_by_test_id(modal_test_id)
    expect(main_dialog).to_have_count(0)


def test_dialog_dismisses_properly(app: Page):
    """Test that dialog is dismissed properly after clicking on close (= dismiss)."""
    open_dialog_with_images(app)
    wait_for_app_run(app)
    main_dialog = app.get_by_test_id(modal_test_id)
    expect(main_dialog).to_have_count(1)

    click_to_dismiss(app)
    expect(main_dialog).not_to_be_visible()
    main_dialog = app.get_by_test_id(modal_test_id)
    expect(main_dialog).to_have_count(0)


def test_dialog_reopens_properly_after_dismiss(app: Page):
    """Test that dialog reopens after dismiss."""

    # open and close the dialog multiple times
    for _ in range(0, 10):
        open_dialog_without_images(app)
        wait_for_app_run(app)

        main_dialog = app.get_by_test_id(modal_test_id)
        expect(main_dialog).to_have_count(1)

        click_to_dismiss(app)
        expect(main_dialog).not_to_be_attached()

        main_dialog = app.get_by_test_id(modal_test_id)
        expect(main_dialog).to_have_count(0)


def test_dialog_reopens_properly_after_close(app: Page):
    """Test that dialog reopens properly after closing by action button click."""
    # open and close the dialog multiple times
    for _ in range(0, 5):
        open_dialog_with_images(app)

        wait_for_app_run(app, wait_delay=250)
        main_dialog = app.get_by_test_id(modal_test_id)

        expect(main_dialog).to_have_count(1)
        close_button = main_dialog.get_by_test_id("stButton").locator("button").first
        close_button.scroll_into_view_if_needed()
        close_button.click()
        wait_for_app_run(app, wait_delay=250)
        main_dialog = app.get_by_test_id(modal_test_id)
        expect(main_dialog).to_have_count(0)


def test_dialog_stays_dismissed_when_interacting_with_different_fragment(app: Page):
    """Dismissing a dialog is a UI-only interaction as of today (the Python backend does
    not know about this). We use a deltaMsgReceivedAt to differentiate React renders
    for dialogs triggered via a new backend message which changes the id vs. other
    interactions. This test ensures that the dialog stays dismissed when interacting
    with a different fragment.
    """

    open_dialog_without_images(app)
    wait_for_app_run(app)

    main_dialog = app.get_by_test_id(modal_test_id)
    expect(main_dialog).to_have_count(1)

    click_to_dismiss(app)
    expect(main_dialog).not_to_be_attached()

    main_dialog = app.get_by_test_id(modal_test_id)
    expect(main_dialog).to_have_count(0)

    # interact with unrelated fragment
    click_button(app, "Fragment Button")
    expect_markdown(app, "Fragment Button clicked")

    # dialog is still closed and did not reopen
    main_dialog = app.get_by_test_id(modal_test_id)
    expect(main_dialog).to_have_count(0)

    # reopen dialog
    open_dialog_without_images(app)
    wait_for_app_run(app)

    main_dialog = app.get_by_test_id(modal_test_id)
    expect(main_dialog).to_have_count(1)


def test_dialog_is_scrollable(app: Page):
    """Test that the dialog is scrollable"""
    open_dialog_with_images(app)
    wait_for_app_run(app)
    main_dialog = app.get_by_test_id(modal_test_id)
    close_button = main_dialog.get_by_test_id("stButton")
    expect(close_button).not_to_be_in_viewport()
    close_button.scroll_into_view_if_needed()
    expect(close_button).to_be_in_viewport()


def test_fullscreen_is_disabled_for_dialog_elements(app: Page):
    """Test that elements within the dialog do not show the fullscreen option."""
    open_dialog_with_images(app)
    wait_for_app_run(app)
    main_dialog = app.get_by_test_id(modal_test_id)
    expect(main_dialog).to_have_count(1)

    # check that the dataframe does not have the fullscreen button
    dataframe_toolbar = app.get_by_test_id("stElementToolbarButton")
    # 2 elements are in the toolbar as of today: download, search
    expect(dataframe_toolbar).to_have_count(2)


def test_actions_for_dialog_headings(app: Page):
    """Test that dialog headings show the tooltip icon but not the link icon."""
    open_headings_dialogs(app)
    wait_for_app_run(app)
    main_dialog = app.get_by_test_id(modal_test_id)
    expect(main_dialog).to_have_count(1)

    # check that the actions-element is there
    action_elements = app.get_by_test_id("stHeaderActionElements")
    expect(action_elements).to_have_count(1)

    # check that the tooltip icon is there and hoverable
    tooltip_element = action_elements.get_by_test_id("stTooltipIcon")
    expect(tooltip_element).to_have_count(1)
    tooltip_element.hover()
    expect(app.get_by_text("Some tooltip!")).to_be_visible()

    # check that the link-icon does not exist
    expect(tooltip_element.locator("a")).not_to_be_attached()


def test_dialog_displays_correctly(app: Page, assert_snapshot: ImageCompareFunction):
    open_dialog_without_images(app)
    wait_for_app_run(app)
    dialog = app.get_by_role("dialog")
    # click on the dialog title to take away focus of all elements and make the
    # screenshot stable. Then hover over the button for visual effect.
    dialog.locator("div", has_text="Simple Dialog").click()
    submit_button = get_button(dialog, "Submit")
    submit_button.hover()
    assert_snapshot(dialog, name="st_dialog-default")


def test_largewidth_dialog_displays_correctly(
    app: Page, assert_snapshot: ImageCompareFunction
):
    open_largewidth_dialog(app)
    wait_for_app_run(app)
    dialog = app.get_by_role("dialog")
    # click on the dialog title to take away focus of all elements and make the
    # screenshot stable. Then hover over the button for visual effect.
    dialog.locator("div", has_text="Large-width Dialog").click()
    submit_button = get_button(dialog, "Submit")
    submit_button.hover()
    assert_snapshot(dialog, name="st_dialog-with_large_width")


# its enough to test this on one browser as showing the error inline is more a backend
# functionality than a frontend one
@pytest.mark.only_browser("chromium")
def test_dialog_shows_error_inline(app: Page, assert_snapshot: ImageCompareFunction):
    """Additional check to the unittests we have to ensure errors thrown during the main
    script execution (not a fragment-only rerun) are rendered within the dialog."""
    open_dialog_with_internal_error(app)
    wait_for_app_run(app)
    dialog = app.get_by_role("dialog")
    # click on the dialog title to take away focus of all elements and make the
    # screenshot stable. Then hover over the button for visual effect.
    dialog.locator("div", has_text="Dialog with error").click()
    expect(dialog.get_by_text("TypeError")).to_be_visible()
    assert_snapshot(dialog, name="st_dialog-with_inline_error")


def test_sidebar_dialog_displays_correctly(
    app: Page, assert_snapshot: ImageCompareFunction
):
    open_sidebar_dialog(app)
    wait_for_app_run(app, wait_delay=200)
    dialog = app.get_by_role("dialog")
    submit_button = get_button(dialog, "Submit")
    submit_button.hover()
    assert_snapshot(dialog, name="st_dialog-in_sidebar")


def test_nested_dialogs(app: Page):
    """Test that st.dialog may not be nested inside other dialogs."""
    open_nested_dialogs(app)
    wait_for_app_run(app)
    expect_exception(
        app, "StreamlitAPIException: Dialogs may not be nested inside other dialogs."
    )


# on webkit this test was flaky and manually reproducing the flaky error did not work,
# so we skip it for now
@pytest.mark.skip_browser("webkit")
def test_dialogs_have_different_fragment_ids(app: Page):
    """Test that st.dialog may not be nested inside other dialogs."""
    open_submit_button_dialog(app)
    wait_for_app_run(app)
    large_width_dialog_fragment_id = get_markdown(app, "Fragment Id:").text_content()
    dialog = app.get_by_role("dialog")
    submit_button = get_button(dialog, "Submit")
    submit_button.click()
    wait_for_app_run(app)

    open_nested_dialogs(app)
    wait_for_app_run(app)
    nested_dialog_fragment_id = get_markdown(app, "Fragment Id:").text_content()
    expect_exception(
        app, "StreamlitAPIException: Dialogs may not be nested inside other dialogs."
    )

    click_to_dismiss(app)
    # wait after dismiss so that we can open the next dialog
    app.wait_for_timeout(1000)
    expect(app.get_by_test_id(modal_test_id)).not_to_be_attached()
    open_submit_button_dialog(app)
    wait_for_app_run(app)
    dialog = app.get_by_role("dialog")

    submit_button = get_button(dialog, "Submit")
    submit_button.click()
    wait_for_app_run(app)

    expect_no_exception(app)

    assert large_width_dialog_fragment_id != nested_dialog_fragment_id


def test_dialog_copy_buttons_work(app: Page):
    """Test that the copy buttons in the dialog work as expected.

    We paste the copied content into an input field. We could use
    playwright's app.evaluate("navigator.clipboard.readText()") to get
    the copied text, but then we have to grant permission to the user
    agent to allow accessing the clipboard.
    """

    open_dialog_with_copy_buttons(app)
    wait_for_app_run(app)

    expect(app.get_by_test_id("stMarkdown")).to_have_text("")

    # click icon button
    json_element = app.get_by_test_id("stJson")
    json_element.hover()
    json_element.locator(".copy-icon").first.click()

    # paste the copied content into the input field
    app.get_by_test_id("stTextInput").locator("input").click()
    app.keyboard.press(f"{COMMAND_KEY}+V")
    app.keyboard.press("Enter")

    # we should see the pasted content written to the dialog
    expect(app.get_by_test_id("stMarkdown")).to_have_text("[1,2,3]")


def test_experimental_dialog_deprecation_warning(app: Page):
    """Test that using @st.experimental_dialog instead of @st.dialog results in a
    deprecation warning being displayed in the dialog.
    """
    expect(app.get_by_test_id("stAlert")).not_to_be_attached()

    open_dialog_with_deprecation_warning(app)

    expect(app.get_by_test_id("stAlert")).to_have_text(
        re.compile("Please replace st.experimental_dialog with st.dialog.\n.*")
    )


def test_dialog_with_chart(app: Page):
    open_dialog_with_chart(app)
    wait_for_app_run(app)
    main_dialog = app.get_by_test_id(modal_test_id)
    expect(main_dialog).to_have_count(1)

    # Check for the chart & tooltip
    chart = main_dialog.get_by_test_id("stVegaLiteChart")
    chart.hover(position={"x": 60, "y": 220})
    tooltip = app.locator("#vg-tooltip-element")
    expect(tooltip).to_be_visible()


def test_check_top_level_class(app: Page):
    """Check that the top level class is correctly set."""
    open_dialog_with_images(app)
    check_top_level_class(app, "stDialog")
