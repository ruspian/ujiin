import { ReligionData as PrismaReligion } from "@/prisma/client";

export interface ReligionData {
  id: string;
  name: string;
}

export interface AgamaClientProps {
  religions: ReligionData[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface AddAgamaModalProps {
  setIsModalOpen: (val: boolean) => void;
}

export interface EditAgamaModalProps {
  itemData: { id: string; name: string };
  setIsModalEditOpen: (val: boolean) => void;
}

export interface DeleteAgamaModalProps {
  itemData: PrismaReligion;
  setIsModalDeleteOpen: (open: boolean) => void;
  forceLoading?: boolean;
}
