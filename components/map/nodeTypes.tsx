import React, { memo } from "react";
import MapNodeDefault from "./MapNodeDefault";
import { TextNode } from "./MapEditor/components/TextNode";
import { CommentNode } from "./CommentNode";
import { NodeProps } from "@xyflow/react";

const ViewOnlyTextNode = ({ data, selected }: NodeProps) => (
  <TextNode
    data={data as any}
    selected={selected}
    allowEdit={false}
    allowDoubleClick={false}
    showHint={false}
  />
);

const ViewOnlyCommentNode = ({ data, selected }: NodeProps) => {
  const { userRole, isInstructorOrTA } = data as any;

  return (
    <CommentNode
      data={data as any}
      selected={selected}
      userRole={userRole}
      allowEdit={isInstructorOrTA}
      allowDoubleClick={isInstructorOrTA}
      showHint={true}
      showEditButton={true}
      onDataChange={(updatedData) => {
        if (isInstructorOrTA && updatedData) {
          // TODO: Persist comment changes to database
          console.log("Comment node updated:", updatedData);
        }
      }}
    />
  );
};

export const nodeTypes = {
  default: MapNodeDefault,
  text: memo(ViewOnlyTextNode),
  comment: memo(ViewOnlyCommentNode),
};
