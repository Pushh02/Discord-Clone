"use client";

import { useEffect, useState } from "react";

import CreateServerModal from "../models/create-server-modal";
import InviteModal from "../models/invite-modal";
import EditServerModel from "../models/edit-server-modal";
import MembersModel from "../models/members-modal";
import CreateChannelModal from "../models/create-channel-modal";
import LeaveServer from "../models/leave-server-modal";
import DeleteServerModal from "../models/delete-server-modal";
import DeleteChannelModal from "../models/delete-channel-modal";
import EditChannelModal from "../models/edit-channel-modal";

export const ModalProvider = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if(!isMounted){
    return null;
  }

  return (
    <>
      <CreateServerModal />
      <InviteModal />
      <EditServerModel />
      <MembersModel />
      <CreateChannelModal />
      <LeaveServer />
      <DeleteServerModal />
      <DeleteChannelModal />
      <EditChannelModal />
    </>
  );
};
