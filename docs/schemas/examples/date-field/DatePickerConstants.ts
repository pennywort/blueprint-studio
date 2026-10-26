export enum ModeProp {
	date = 'date',
	time = 'time',
	datetime = 'datetime',
}

export type ModeModel = `${(typeof ModeProp)[keyof typeof ModeProp]}`;
