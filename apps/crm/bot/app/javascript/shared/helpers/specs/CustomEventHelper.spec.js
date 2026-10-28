import { dispatchWindowEvent } from '../CustomEventHelper';

describe('dispatchWindowEvent', () => {
  it('dispatches correct event', () => {
    window.dispatchEvent = vi.fn();
    dispatchWindowEvent({ eventName: 'kovaa-lab:ready' });
    expect(dispatchEvent).toHaveBeenCalled();
  });
});
