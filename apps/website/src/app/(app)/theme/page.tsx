"use client";

// Icons
import { Star, Info, Warning, CaretUpDown, QrCode } from "@phosphor-icons/react/dist/ssr";
import * as React from "react";
import { toast } from "sonner";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
// Foundational
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "~/components/ui/collapsible";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from "~/components/ui/context-menu";
// Overlays & Modals
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "~/components/ui/drawer";
// Note: Combobox, Autocomplete, Calendar can be complex to setup dummy data for, included basic Select for now.

// Navigation & Menus
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import { Empty, EmptyTitle, EmptyDescription } from "~/components/ui/empty";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "~/components/ui/hover-card";
import { Input } from "~/components/ui/input";
import { InputGroup, InputGroupText, InputGroupInput } from "~/components/ui/input-group";
// Advanced Inputs
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "~/components/ui/input-otp";
import { Kbd } from "~/components/ui/kbd";
import { Label } from "~/components/ui/label";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationPrevious,
    PaginationNext,
} from "~/components/ui/pagination";
import { Popover, PopoverTrigger, PopoverPopup } from "~/components/ui/popover";
import { Progress } from "~/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "~/components/ui/resizable";
// Layout & Utilities
import { ScrollArea } from "~/components/ui/scroll-area";
// Pickers & Selects
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { Slider } from "~/components/ui/slider";
// Notifications
import { Toaster } from "~/components/ui/sonner";
import { Spinner } from "~/components/ui/spinner";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { Toggle } from "~/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipPopup } from "~/components/ui/tooltip";

export default function ThemePage() {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="container mx-auto space-y-16 p-8 pb-32">
            <Toaster />

            <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">Theme Showcase</h1>
                <p className="text-muted-foreground text-lg">A comprehensive visual digest of all the components in the theme.</p>
            </div>

            <Separator />

            {/* Overlays & Modals */}
            <section className="space-y-6">
                <h2 className="border-b pb-2 text-3xl font-semibold">Overlays & Modals</h2>
                <div className="flex flex-wrap items-center gap-4">
                    <Dialog>
                        <DialogTrigger render={<Button variant="outline" />}>Open Dialog</DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Are you absolutely sure?</DialogTitle>
                                <DialogDescription>
                                    This action cannot be undone. This will permanently delete your account and remove your data from our
                                    servers.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4 flex justify-end gap-4">
                                <Button variant="outline">Cancel</Button>
                                <Button>Continue</Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Sheet>
                        <SheetTrigger render={<Button variant="outline" />}>Open Sheet</SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>Edit profile</SheetTitle>
                                <SheetDescription>Make changes to your profile here. Click save when you're done.</SheetDescription>
                            </SheetHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input id="name" defaultValue="Pedro Duarte" />
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>

                    <Drawer>
                        <DrawerTrigger asChild>
                            <Button variant="outline">Open Drawer</Button>
                        </DrawerTrigger>
                        <DrawerContent>
                            <DrawerHeader>
                                <DrawerTitle>Are you absolutely sure?</DrawerTitle>
                                <DrawerDescription>This action cannot be undone.</DrawerDescription>
                            </DrawerHeader>
                        </DrawerContent>
                    </Drawer>

                    <Popover>
                        <PopoverTrigger render={<Button variant="outline" />}>Open Popover</PopoverTrigger>
                        <PopoverPopup className="w-80 p-4">
                            <div className="space-y-2">
                                <h4 className="leading-none font-medium">Dimensions</h4>
                                <p className="text-muted-foreground text-sm">Set the dimensions for the layer.</p>
                            </div>
                        </PopoverPopup>
                    </Popover>

                    <HoverCard>
                        <HoverCardTrigger render={<Button variant="link" />}>Hover me</HoverCardTrigger>
                        <HoverCardContent className="w-80">
                            <div className="flex justify-between space-x-4">
                                <Avatar>
                                    <AvatarFallback>VC</AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-semibold">@vercel</h4>
                                    <p className="text-sm">The React Framework – created and maintained by @vercel.</p>
                                </div>
                            </div>
                        </HoverCardContent>
                    </HoverCard>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger render={<Button variant="outline" size="icon" />}>
                                <Info />
                            </TooltipTrigger>
                            <TooltipPopup>
                                <p>Add to library</p>
                            </TooltipPopup>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </section>

            {/* Navigation & Menus */}
            <section className="space-y-6">
                <h2 className="border-b pb-2 text-3xl font-semibold">Navigation & Menus</h2>

                <div className="flex flex-wrap items-start gap-8">
                    <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="outline" />}>
                            Open Menu <CaretUpDown className="ml-2" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Profile</DropdownMenuItem>
                            <DropdownMenuItem>Billing</DropdownMenuItem>
                            <DropdownMenuItem>Team</DropdownMenuItem>
                            <DropdownMenuItem>Subscription</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <ContextMenu>
                        <ContextMenuTrigger className="flex h-[100px] w-[200px] items-center justify-center rounded-md border border-dashed text-sm">
                            Right click here
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            <ContextMenuItem>Back</ContextMenuItem>
                            <ContextMenuItem>Forward</ContextMenuItem>
                            <ContextMenuItem>Reload</ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>

                    <div className="min-w-[300px] flex-1 space-y-4">
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/components">Components</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>

                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious href="#" />
                                </PaginationItem>
                                <PaginationItem>
                                    <PaginationLink href="#">1</PaginationLink>
                                </PaginationItem>
                                <PaginationItem>
                                    <PaginationLink href="#" isActive>
                                        2
                                    </PaginationLink>
                                </PaginationItem>
                                <PaginationItem>
                                    <PaginationLink href="#">3</PaginationLink>
                                </PaginationItem>
                                <PaginationItem>
                                    <PaginationNext href="#" />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                </div>
            </section>

            {/* Advanced Inputs & Forms */}
            <section className="space-y-6">
                <h2 className="border-b pb-2 text-3xl font-semibold">Inputs & Form Controls</h2>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {/* Basic */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="m@example.com" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="message">Message</Label>
                            <Textarea id="message" placeholder="Type your message here." />
                        </div>
                        <div className="space-y-2">
                            <Label>Input Group</Label>
                            <InputGroup>
                                <InputGroupText>https://</InputGroupText>
                                <InputGroupInput placeholder="example.com" />
                            </InputGroup>
                        </div>
                    </div>

                    {/* Pickers & Selects */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Select</Label>
                            <Select>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a fruit" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="apple">Apple</SelectItem>
                                    <SelectItem value="banana">Banana</SelectItem>
                                    <SelectItem value="blueberry">Blueberry</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Input OTP</Label>
                            <InputOTP maxLength={6}>
                                <InputOTPGroup>
                                    <InputOTPSlot index={0} />
                                    <InputOTPSlot index={1} />
                                    <InputOTPSlot index={2} />
                                </InputOTPGroup>
                                <InputOTPSeparator />
                                <InputOTPGroup>
                                    <InputOTPSlot index={3} />
                                    <InputOTPSlot index={4} />
                                    <InputOTPSlot index={5} />
                                </InputOTPGroup>
                            </InputOTP>
                        </div>
                    </div>

                    {/* Toggles & Switches */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Switch id="airplane-mode" />
                            <Label htmlFor="airplane-mode">Airplane Mode</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="terms" />
                            <Label htmlFor="terms">Accept terms and conditions</Label>
                        </div>

                        <div className="space-y-2">
                            <Label>Radio Group</Label>
                            <RadioGroup defaultValue="comfortable">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="default" id="r1" />
                                    <Label htmlFor="r1">Default</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="comfortable" id="r2" />
                                    <Label htmlFor="r2">Comfortable</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="compact" id="r3" />
                                    <Label htmlFor="r3">Compact</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-2">
                            <Label>Toggle & Toggle Group</Label>
                            <div className="flex items-center gap-4">
                                <Toggle aria-label="Toggle italic">
                                    <Star className="h-4 w-4" />
                                </Toggle>

                                <ToggleGroup>
                                    <ToggleGroupItem value="a">A</ToggleGroupItem>
                                    <ToggleGroupItem value="b">B</ToggleGroupItem>
                                    <ToggleGroupItem value="c">C</ToggleGroupItem>
                                </ToggleGroup>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Layout & Structure */}
            <section className="space-y-6">
                <h2 className="border-b pb-2 text-3xl font-semibold">Layout & Structure</h2>
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Scroll Area</h3>
                        <ScrollArea className="h-48 w-full rounded-md border p-4">
                            Jokester began sneaking into the castle in the middle of the night and leaving jokes all over the place: under
                            the king's pillow, in his soup, even in the royal toilet. The king was furious, but he couldn't seem to stop
                            Jokester.
                            <br />
                            <br />
                            And then, one day, the people of the kingdom discovered that the jokes left by Jokester were so funny that they
                            couldn't help but laugh. And once they started laughing, they couldn't stop.
                            <br />
                            <br />
                            Eventually, even the king had to give in, and he allowed Jokester to become the official jester of the kingdom.
                            And they all lived happily ever after, laughing their way through the rest of their lives.
                        </ScrollArea>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Collapsible</h3>
                        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-[350px] space-y-2">
                            <div className="flex items-center justify-between space-x-4 rounded-md border px-4 py-2">
                                <h4 className="text-sm font-semibold">@peduarte starred 3 repositories</h4>
                                <CollapsibleTrigger render={<Button variant="ghost" size="sm" className="w-9 p-0" />}>
                                    <CaretUpDown className="h-4 w-4" />
                                    <span className="sr-only">Toggle</span>
                                </CollapsibleTrigger>
                            </div>
                            <div className="rounded-md border px-4 py-3 font-mono text-sm">@radix-ui/primitives</div>
                            <CollapsibleContent className="space-y-2">
                                <div className="rounded-md border px-4 py-3 font-mono text-sm">@radix-ui/colors</div>
                                <div className="rounded-md border px-4 py-3 font-mono text-sm">@stitches/react</div>
                            </CollapsibleContent>
                        </Collapsible>
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    <h3 className="text-lg font-medium">Resizable Panels</h3>
                    <ResizablePanelGroup {...{ direction: "horizontal" }} className="min-h-[200px] max-w-2xl rounded-lg border">
                        <ResizablePanel defaultSize={50}>
                            <div className="flex h-full items-center justify-center p-6">
                                <span className="font-semibold">Sidebar</span>
                            </div>
                        </ResizablePanel>
                        <ResizableHandle />
                        <ResizablePanel defaultSize={50}>
                            <ResizablePanelGroup {...{ direction: "vertical" }}>
                                <ResizablePanel defaultSize={25}>
                                    <div className="flex h-full items-center justify-center p-6">
                                        <span className="font-semibold">Header</span>
                                    </div>
                                </ResizablePanel>
                                <ResizableHandle />
                                <ResizablePanel defaultSize={75}>
                                    <div className="flex h-full items-center justify-center p-6">
                                        <span className="font-semibold">Content</span>
                                    </div>
                                </ResizablePanel>
                            </ResizablePanelGroup>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </section>

            {/* Buttons & Badges (Recap) */}
            <section className="space-y-6">
                <h2 className="border-b pb-2 text-3xl font-semibold">Buttons & Badges</h2>
                <div className="flex flex-wrap items-center gap-4">
                    <Button variant="default">Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                    <Button variant="default" disabled>
                        Disabled
                    </Button>
                    <Button variant="default" size="sm">
                        Small
                    </Button>
                    <Button variant="default" size="lg">
                        Large
                    </Button>
                    <Button variant="default" size="icon">
                        <Star />
                    </Button>
                </div>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                    <Badge variant="default">Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                    <Badge variant="outline">Outline</Badge>
                </div>
            </section>

            {/* Data Display & Feedback */}
            <section className="space-y-6">
                <h2 className="border-b pb-2 text-3xl font-semibold">Data Display & Feedback</h2>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Card Title</CardTitle>
                                <CardDescription>Card Description goes here.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p>Content of the card</p>
                            </CardContent>
                            <CardFooter>
                                <Button>Action</Button>
                            </CardFooter>
                        </Card>

                        <div className="space-y-4 rounded-lg border p-4">
                            <h3 className="font-medium">Loading States</h3>
                            <div className="flex items-center gap-4">
                                <Spinner className="text-primary size-6" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-[250px]" />
                                    <Skeleton className="h-4 w-[200px]" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 rounded-lg border p-4">
                            <h3 className="font-medium">Progress</h3>
                            <Progress value={60} className="w-full" />
                            <Slider defaultValue={[50]} max={100} step={1} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Alert>
                            <Info className="size-4" />
                            <div className="flex-1">
                                <AlertTitle>Information</AlertTitle>
                                <AlertDescription>Here is some helpful information.</AlertDescription>
                            </div>
                        </Alert>
                        <Alert variant="error">
                            <Warning className="size-4" />
                            <div className="flex-1">
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>Something went wrong.</AlertDescription>
                            </div>
                        </Alert>

                        <div className="pt-4">
                            <Button
                                variant="outline"
                                onClick={() => toast("Event has been created", { description: "Sunday, December 03, 2023 at 9:00 AM" })}
                            >
                                Show Toast
                            </Button>
                        </div>

                        <div className="space-y-2 pt-4">
                            <Label>QR Code & Kbd</Label>
                            <div className="flex items-center gap-4">
                                <div className="bg-muted flex size-24 items-center justify-center rounded-lg border border-dashed">
                                    <QrCode className="text-muted-foreground size-6" />
                                </div>
                                <div>
                                    Press <Kbd>Ctrl</Kbd> + <Kbd>C</Kbd>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs & Empty */}
                <div className="grid grid-cols-1 gap-8 pt-4 lg:grid-cols-2">
                    <Tabs defaultValue="account" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="account">Account</TabsTrigger>
                            <TabsTrigger value="password">Password</TabsTrigger>
                        </TabsList>
                        <TabsContent value="account">
                            <Card className="text-muted-foreground p-4 text-sm">Make changes to your account here.</Card>
                        </TabsContent>
                        <TabsContent value="password">
                            <Card className="text-muted-foreground p-4 text-sm">Change your password here.</Card>
                        </TabsContent>
                    </Tabs>

                    <div className="flex items-center justify-center rounded-lg border border-dashed p-8">
                        <Empty>
                            <EmptyTitle>No results found</EmptyTitle>
                            <EmptyDescription>Try adjusting your search or filters to find what you're looking for.</EmptyDescription>
                            <Button variant="outline" className="mt-4">
                                Clear filters
                            </Button>
                        </Empty>
                    </div>
                </div>
            </section>
        </div>
    );
}
