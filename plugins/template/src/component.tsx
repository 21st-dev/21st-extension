import { Button, Panel, useToolbar } from '@21st-extension/toolbar/plugin-ui';

export const ExampleComponent = () => {
  const toolbar = useToolbar();

  return (
    <Panel>
      <Panel.Header title="Example Plugin" />
      <Panel.Content>
        <Button onClick={() => toolbar.sendPrompt('Hello world!')}>
          Send "Hello world!" to Cursor!
        </Button>
      </Panel.Content>
    </Panel>
  );
};
