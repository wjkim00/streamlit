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

import React, { CSSProperties, ReactElement } from "react"

import {
  ImageList as ImageListProto,
  Image as ImageProto,
} from "@streamlit/lib/src/proto"
import { StreamlitEndpoints } from "@streamlit/lib/src/StreamlitEndpoints"
import Toolbar, {
  StyledToolbarElementContainer,
} from "@streamlit/lib/src/components/shared/Toolbar"
import { ElementFullscreenContext } from "@streamlit/lib/src/components/shared/ElementFullscreen/ElementFullscreenContext"
import { useRequiredContext } from "@streamlit/lib/src/hooks/useRequiredContext"
import { withFullScreenWrapper } from "@streamlit/lib/src/components/shared/FullScreenWrapper"

import {
  StyledCaption,
  StyledImageContainer,
  StyledImageList,
} from "./styled-components"

export interface ImageListProps {
  endpoints: StreamlitEndpoints
  width: number
  element: ImageListProto
  disableFullscreenMode?: boolean
}

/**
 * @see WidthBehavior on the Backend
 * @see the Image.proto file
 */
enum WidthBehavior {
  OriginalWidth = -1,
  /** @deprecated */
  ColumnWidth = -2,
  /** @deprecated */
  AutoWidth = -3,
  MinImageOrContainer = -4,
  MaxImageOrContainer = -5,
}

/**
 * Functional element for a horizontal list of images.
 */
function ImageList({
  element,
  width,
  endpoints,
  disableFullscreenMode,
}: Readonly<ImageListProps>): ReactElement {
  const {
    expanded: isFullScreen,
    width: fullScreenWidth,
    height,
    expand,
    collapse,
  } = useRequiredContext(ElementFullscreenContext)

  // The width field in the proto sets the image width, but has special
  // cases the values in the WidthBehavior enum.
  let containerWidth: number | undefined
  const protoWidth = element.width

  if (
    [
      WidthBehavior.OriginalWidth,
      WidthBehavior.AutoWidth,
      WidthBehavior.MinImageOrContainer,
    ].includes(protoWidth)
  ) {
    // Use the original image width.
    containerWidth = undefined
  } else if (
    [WidthBehavior.ColumnWidth, WidthBehavior.MaxImageOrContainer].includes(
      protoWidth
    )
  ) {
    // Use the column width unless the image is currently fullscreen, then use the fullscreen width
    containerWidth = isFullScreen ? fullScreenWidth : width
  } else if (protoWidth > 0) {
    // Set the image width explicitly.
    containerWidth = protoWidth
  } else {
    throw Error(`Invalid image width: ${protoWidth}`)
  }

  const imgStyle: CSSProperties = {}

  if (height && isFullScreen) {
    imgStyle.maxHeight = height
    imgStyle.objectFit = "contain"
  } else {
    imgStyle.width = containerWidth
    // Cap the image width, so it doesn't exceed its parent container width
    imgStyle.maxWidth = "100%"
  }

  return (
    <StyledToolbarElementContainer
      width={containerWidth}
      height={height}
      useContainerWidth={isFullScreen}
    >
      <Toolbar
        target={StyledToolbarElementContainer}
        isFullScreen={isFullScreen}
        onExpand={expand}
        onCollapse={collapse}
        disableFullscreenMode={disableFullscreenMode}
      ></Toolbar>
      <StyledImageList
        className="stImage"
        data-testid="stImage"
        style={{ width: containerWidth }}
      >
        {element.imgs.map((iimage, idx): ReactElement => {
          const image = iimage as ImageProto
          return (
            <StyledImageContainer data-testid="stImageContainer" key={idx}>
              <img
                style={imgStyle}
                src={endpoints.buildMediaURL(image.url)}
                alt={idx.toString()}
              />
              {image.caption && (
                <StyledCaption data-testid="stImageCaption" style={imgStyle}>
                  {` ${image.caption} `}
                </StyledCaption>
              )}
            </StyledImageContainer>
          )
        })}
      </StyledImageList>
    </StyledToolbarElementContainer>
  )
}

export default withFullScreenWrapper(ImageList)
