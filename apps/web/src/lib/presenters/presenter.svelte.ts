/** Reactive presentation state shared by the native Svelte screens. */
export class Presenter {
  revision = $state(0);
  state: Record<string, any> = {};
  data: any;
  getProps: () => Record<string, any>;
  [key: string]: any;

  constructor(data: any, getProps = () => ({})) {
    this.data = data;
    this.getProps = getProps;
  }

  setState(patch: Record<string, any> | ((state: Record<string, any>) => Record<string, any>)) {
    Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch);
    this.revision += 1;
  }
}
