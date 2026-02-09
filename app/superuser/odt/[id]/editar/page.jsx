"use client";

import { useParams } from "next/navigation";
import ODTForm from "../../ODTForm";

export default  function EditarODTPage({ params }) {
  const { id } = useParams(params);
  return <ODTForm mode="edit" odtId={id} />;
}