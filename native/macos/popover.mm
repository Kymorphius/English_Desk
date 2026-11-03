#import <Cocoa/Cocoa.h>
#include <node_api.h>
#include <vector>

@interface EDMenuPanel : NSObject <NSPopoverDelegate>
@property(strong) NSStatusItem *item;
@property(strong) NSPopover *popover;
@property(strong) NSView *content;
@property(strong) NSWindow *owner;
@property(strong) NSVisualEffectView *glass;
@property(strong) id keyMonitor;
@property BOOL pinned;
@property napi_env env;
@property napi_ref callback;
- (void)show;
- (void)notify:(NSString *)event;
@end
@implementation EDMenuPanel
- (void)notify:(NSString *)event {
  napi_handle_scope scope; napi_open_handle_scope(self.env,&scope);
  napi_value cb,global,arg,result; napi_get_reference_value(self.env,self.callback,&cb);
  napi_get_global(self.env,&global); napi_create_string_utf8(self.env,event.UTF8String,NAPI_AUTO_LENGTH,&arg);
  napi_call_function(self.env,global,cb,1,&arg,&result); napi_close_handle_scope(self.env,scope);
}
- (void)show {
  NSStatusBarButton *b=self.item.button;
  NSSize size=NSMakeSize(400,MIN(720,b.window.screen.visibleFrame.size.height-30));
  self.popover.contentSize=size;
  [NSApp activateIgnoringOtherApps:YES];
  [self.popover showRelativeToRect:b.bounds ofView:b preferredEdge:NSMinYEdge];
  self.content.frame=self.glass.bounds;
  NSWindow *w=self.popover.contentViewController.view.window;
  w.level=NSFloatingWindowLevel;
  [w makeKeyWindow]; [w makeFirstResponder:self.content];
  [self notify:@"show"];
}
- (void)clicked:(id)sender {
  if(NSApp.currentEvent.type==NSEventTypeRightMouseUp){
    NSMenu *menu=[[NSMenu alloc] init];
    NSMenuItem *open=[menu addItemWithTitle:@"打开 English Desk" action:@selector(open:) keyEquivalent:@""];open.target=self;
    NSMenuItem *pin=[menu addItemWithTitle:@"面板置顶" action:@selector(pin:) keyEquivalent:@""];pin.target=self;pin.state=self.pinned?NSControlStateValueOn:NSControlStateValueOff;
    [menu addItem:NSMenuItem.separatorItem];
    NSMenuItem *quit=[menu addItemWithTitle:@"退出 English Desk" action:@selector(quit:) keyEquivalent:@""];quit.target=self;
    self.item.menu=menu;[self.item.button performClick:nil];self.item.menu=nil;return;
  }
  if(self.popover.shown)[self.popover performClose:nil];else [self show];
}
- (void)open:(id)sender {[self show];}
- (void)pin:(id)sender {self.pinned=!self.pinned;self.popover.behavior=self.pinned?NSPopoverBehaviorApplicationDefined:NSPopoverBehaviorTransient;[self notify:@"pin"];}
- (void)quit:(id)sender {[self notify:@"quit"];}
- (void)popoverDidShow:(NSNotification *)notification {
  // The popover lays out its content after the opening animation.
  [self.glass layoutSubtreeIfNeeded];
  self.content.frame=self.glass.bounds;
  [self.popover.contentViewController.view.window makeFirstResponder:self.content];
  [self notify:@"show"];
}
- (void)popoverDidClose:(NSNotification *)notification {[self notify:@"hide"];}
@end
static EDMenuPanel *panel;
static napi_value undefined(napi_env env){napi_value v;napi_get_undefined(env,&v);return v;}
static napi_value Create(napi_env env,napi_callback_info info){
  size_t argc=3;napi_value args[3];napi_get_cb_info(env,info,&argc,args,NULL,NULL);
  void *bytes=NULL;size_t size=0;bool pinned=false;
  if(argc!=3||napi_get_buffer_info(env,args[0],&bytes,&size)!=napi_ok||size!=sizeof(void *)){napi_throw_error(env,NULL,"Invalid native view handle");return NULL;}
  napi_get_value_bool(env,args[1],&pinned);
  NSView *handle=(__bridge NSView *)(*(void **)bytes);
  panel=[EDMenuPanel new];panel.env=env;napi_ref callback;napi_create_reference(env,args[2],1,&callback);panel.callback=callback;
  panel.owner=handle.window;panel.content=panel.owner.contentView;panel.pinned=pinned;
  [panel.owner orderOut:nil];
  panel.owner.contentView=[[NSView alloc] initWithFrame:NSMakeRect(0,0,400,720)];
  panel.glass=[[NSVisualEffectView alloc] initWithFrame:NSMakeRect(0,0,400,720)];
  panel.glass.material=NSVisualEffectMaterialPopover;panel.glass.blendingMode=NSVisualEffectBlendingModeBehindWindow;panel.glass.state=NSVisualEffectStateActive;
  panel.content.frame=panel.glass.bounds;panel.content.translatesAutoresizingMaskIntoConstraints=YES;panel.content.autoresizingMask=NSViewWidthSizable|NSViewHeightSizable;[panel.glass addSubview:panel.content];
  NSViewController *vc=[NSViewController new];vc.view=panel.glass;
  panel.popover=[NSPopover new];panel.popover.contentViewController=vc;panel.popover.delegate=panel;
  panel.popover.contentSize=NSMakeSize(400,720);panel.popover.behavior=pinned?NSPopoverBehaviorApplicationDefined:NSPopoverBehaviorTransient;
  panel.item=[NSStatusBar.systemStatusBar statusItemWithLength:NSSquareStatusItemLength];
  panel.item.autosaveName=@"EnglishDeskStudioStatus";
  NSStatusBarButton *button=panel.item.button;button.image=[NSImage imageWithSystemSymbolName:@"character.book.closed" accessibilityDescription:@"English Desk Studio"];[button.image setTemplate:YES];
  button.toolTip=@"English Desk Studio";button.target=panel;button.action=@selector(clicked:);[button sendActionOn:NSEventMaskLeftMouseUp|NSEventMaskRightMouseUp];
  panel.keyMonitor=[NSEvent addLocalMonitorForEventsMatchingMask:NSEventMaskKeyDown handler:^NSEvent *(NSEvent *event){if(event.keyCode==53&&panel.popover.shown){[panel.popover performClose:nil];return nil;}return event;}];
  return undefined(env);
}
static napi_value Show(napi_env env,napi_callback_info info){[panel show];return undefined(env);}
static napi_value Hide(napi_env env,napi_callback_info info){[panel.popover performClose:nil];return undefined(env);}
static napi_value SetPinned(napi_env env,napi_callback_info info){size_t argc=1;napi_value arg;napi_get_cb_info(env,info,&argc,&arg,NULL,NULL);bool value=false;napi_get_value_bool(env,arg,&value);panel.pinned=value;panel.popover.behavior=value?NSPopoverBehaviorApplicationDefined:NSPopoverBehaviorTransient;return undefined(env);}
static napi_value Click(napi_env env,napi_callback_info info){[panel.item.button performClick:nil];return undefined(env);}
static NSString *StringArgument(napi_env env,napi_callback_info info){size_t argc=1;napi_value arg;napi_get_cb_info(env,info,&argc,&arg,NULL,NULL);size_t length=0;napi_get_value_string_utf8(env,arg,NULL,0,&length);std::vector<char> bytes(length+1);napi_get_value_string_utf8(env,arg,bytes.data(),bytes.size(),&length);return [NSString stringWithUTF8String:bytes.data()];}
static napi_value SelectFile(napi_env env,napi_callback_info info){
 NSString *kind=StringArgument(env,info);[NSApp activateIgnoringOtherApps:YES];
 NSSavePanel *picker;
 if([kind isEqualToString:@"recording"]){picker=[NSSavePanel savePanel];picker.nameFieldStringValue=@"speaking.webm";picker.allowedFileTypes=@[@"webm"];}
 else{NSOpenPanel *open=[NSOpenPanel openPanel];open.canChooseDirectories=NO;open.allowsMultipleSelection=NO;open.allowedFileTypes=[kind isEqualToString:@"template"]?@[@"txt",@"md"]:@[@"json",@"txt",@"md",@"csv",@"tsv"];picker=open;}
 picker.level=NSModalPanelWindowLevel;NSModalResponse result=[picker runModal];
 napi_value out;if(result==NSModalResponseOK)napi_create_string_utf8(env,picker.URL.path.UTF8String,NAPI_AUTO_LENGTH,&out);else napi_get_null(env,&out);return out;
}
static napi_value Confirm(napi_env env,napi_callback_info info){
 NSAlert *alert=[NSAlert new];alert.messageText=StringArgument(env,info);[alert addButtonWithTitle:@"确定"];[alert addButtonWithTitle:@"取消"];
 [NSApp activateIgnoringOtherApps:YES];alert.window.level=NSModalPanelWindowLevel;napi_value out;napi_get_boolean(env,[alert runModal]==NSAlertFirstButtonReturn,&out);return out;
}
static napi_value Inspect(napi_env env,napi_callback_info info){
  NSRect b=panel.item.button.window.frame;NSRect p=panel.popover.contentViewController.view.window.frame;
  NSDictionary *state=@{@"kind":@"NSPopover",@"shown":@(panel.popover.shown),@"pinned":@(panel.pinned),@"templateIcon":@([panel.item.button.image isTemplate]),@"material":@(panel.glass.material),@"behindWindow":@(panel.glass.blendingMode==NSVisualEffectBlendingModeBehindWindow),@"glassWidth":@(panel.glass.frame.size.width),@"contentClass":NSStringFromClass(panel.content.class),@"subviews":panel.content.subviews.description,@"width":@(panel.content.frame.size.width),@"height":@(panel.content.frame.size.height),@"statusX":@(b.origin.x),@"statusY":@(b.origin.y),@"statusVisible":@(panel.item.button.window.occlusionState&NSWindowOcclusionStateVisible),@"popoverX":@(p.origin.x),@"popoverY":@(p.origin.y),@"popoverHeight":@(p.size.height)};
  NSData *json=[NSJSONSerialization dataWithJSONObject:state options:0 error:nil];napi_value out;napi_create_string_utf8(env,(const char *)json.bytes,json.length,&out);return out;
}
static napi_value Dispose(napi_env env,napi_callback_info info){
  if(panel){panel.popover.delegate=nil;[panel.popover close];[NSEvent removeMonitor:panel.keyMonitor];[NSStatusBar.systemStatusBar removeStatusItem:panel.item];[panel.content removeFromSuperview];panel.owner.contentView=panel.content;napi_delete_reference(env,panel.callback);panel=nil;}return undefined(env);
}
static napi_value Init(napi_env env,napi_value exports){
  napi_property_descriptor methods[]={{"create",0,Create,0,0,0,napi_default,0},{"show",0,Show,0,0,0,napi_default,0},{"hide",0,Hide,0,0,0,napi_default,0},{"inspect",0,Inspect,0,0,0,napi_default,0},{"dispose",0,Dispose,0,0,0,napi_default,0}};
  napi_define_properties(env,exports,sizeof(methods)/sizeof(methods[0]),methods);
  napi_property_descriptor controls[]={{"setPinned",0,SetPinned,0,0,0,napi_default,0},{"clickStatus",0,Click,0,0,0,napi_default,0}};
  napi_define_properties(env,exports,2,controls);
  napi_property_descriptor dialogs[]={{"selectFile",0,SelectFile,0,0,0,napi_default,0},{"confirm",0,Confirm,0,0,0,napi_default,0}};napi_define_properties(env,exports,2,dialogs);return exports;
}
NAPI_MODULE(NODE_GYP_MODULE_NAME,Init)
