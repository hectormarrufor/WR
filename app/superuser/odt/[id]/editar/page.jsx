"use client";

import ODTForm from "../../ODTForm";

export default function EditarODTPage({ params }) {
  return <ODTForm mode="edit" odtId={params.id} />;
}