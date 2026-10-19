import type { ImageMetadata } from 'astro';
import type {
	Certification,
	ExperienceEntry,
	Language,
	Profile,
	Project,
} from './schemas';
import type { SkillGroup } from './skills';

export interface CertificationView extends Certification {
	image?: ImageMetadata | undefined;
	document?: string | undefined;
}

export interface ContactLink {
	label: string;
	value: string;
	href: string;
}

export interface FolderData {
	profile: Profile;
	work: readonly ExperienceEntry[];
	education: readonly ExperienceEntry[];
	skillGroups: readonly SkillGroup[];
	languages: readonly Language[];
	certifications: readonly CertificationView[];
	projects: readonly Project[];
	contact: readonly ContactLink[];
}
